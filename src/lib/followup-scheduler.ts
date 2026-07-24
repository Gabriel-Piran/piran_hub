import { supabaseAdmin } from "./supabase";

/**
 * Brasil não tem horário de verão desde 2019 — UTC-3 fixo. O servidor
 * (Railway) roda em UTC, então Date.setHours/getDay aplicam o fuso do
 * SERVIDOR, não o de Brasília — sem isso, "horário comercial 08h-18h"
 * vira 08h-18h UTC (= 05h-15h em Brasília), 3h adiantado. paraBrasil +
 * horarioBrasilParaUTC evitam depender do fuso do processo Node.
 */
const BRASIL_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Desloca o instante pro fuso de Brasília — os getters getUTC* do resultado já dão ano/mês/dia/hora em horário de Brasília. */
export function paraBrasil(instant: Date): Date {
  return new Date(instant.getTime() - BRASIL_OFFSET_MS);
}

/** Constrói o instante UTC real correspondente a hora:minuto em Brasília, no dia (já em "fuso Brasília") de diaBrasilRef. */
export function horarioBrasilParaUTC(diaBrasilRef: Date, hora: number, minuto: number): Date {
  return new Date(
    Date.UTC(
      diaBrasilRef.getUTCFullYear(),
      diaBrasilRef.getUTCMonth(),
      diaBrasilRef.getUTCDate(),
      hora,
      minuto,
      0,
      0
    ).valueOf() + BRASIL_OFFSET_MS
  );
}

/**
 * Encontra leads elegíveis para uma regra (no estágio-gatilho, parados há
 * dias_espera ou mais, ativos, e que ainda não receberam/estão na fila para
 * essa regra) e agenda o follow-up para eles. Usado tanto pelo endpoint
 * manual POST /api/followup/agendar quanto pela verificação automática de
 * todas as regras em GET /api/followup/verificar-regras.
 */
export async function agendarFollowupsParaRegra(regraId: string): Promise<number> {
  const supabase = supabaseAdmin();

  const { data: regra, error: errorRegra } = await supabase
    .from("followup_regras")
    .select("*")
    .eq("id", regraId)
    .single();

  if (errorRegra || !regra) {
    throw new Error(`Regra ${regraId} não encontrada: ${errorRegra?.message}`);
  }

  const limite = new Date();
  limite.setDate(limite.getDate() - regra.dias_espera);

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id")
    .eq("estagio", regra.estagio_gatilho)
    .lte("estagio_atualizado_em", limite.toISOString())
    .eq("status", "ativo");

  if (leadsError) {
    throw new Error(leadsError.message);
  }
  if (!leads || leads.length === 0) return 0;

  const { data: sent } = await supabase
    .from("followups_enviados")
    .select("lead_id")
    .eq("regra_id", regraId);
  const sentLeadIds = new Set((sent ?? []).map((s) => s.lead_id));

  const { data: queued } = await supabase
    .from("followup_fila")
    .select("lead_id")
    .eq("regra_id", regraId)
    .in("status", ["pendente", "enviado", "cancelado"]);
  const queuedLeadIds = new Set((queued ?? []).map((q) => q.lead_id));

  const eligibleLeadIds = leads
    .map((l) => l.id)
    .filter((id) => !sentLeadIds.has(id) && !queuedLeadIds.has(id));

  if (eligibleLeadIds.length === 0) return 0;

  return scheduleFollowups(eligibleLeadIds, regraId);
}

export async function scheduleFollowups(leadIds: string[], regraId: string): Promise<number> {
  if (!leadIds || leadIds.length === 0) return 0;

  const supabase = supabaseAdmin();

  // Fetch the rule details
  const { data: regra, error: errorRegra } = await supabase
    .from("followup_regras")
    .select("*, mensagens_rapidas(*)")
    .eq("id", regraId)
    .single();

  if (errorRegra || !regra) {
    throw new Error(`Regra ${regraId} não encontrada: ${errorRegra?.message}`);
  }

  const horarioInicio = regra.horario_inicio || "08:00";
  const horarioFim = regra.horario_fim || "18:00";
  const intervalMin = regra.intervalo_minutos_min || 1;
  const intervalMax = Math.max(regra.intervalo_minutos_max || intervalMin, intervalMin);
  const diasSemana = regra.dias_semana || ["1", "2", "3", "4", "5"];

  let texto = regra.mensagem_texto || "";
  let midiaUrl = null;
  let tipo = "texto";

  if (regra.mensagens_rapidas) {
    texto = regra.mensagens_rapidas.conteudo || "";
    midiaUrl = regra.mensagens_rapidas.midia_url || null;
    tipo = regra.mensagens_rapidas.tipo || "texto";
  }

  // Parse start and end hours/minutes
  const [startHour, startMin] = horarioInicio.split(":").map(Number);
  const [endHour, endMin] = horarioFim.split(":").map(Number);

  const startTotalMinutes = startHour * 60 + startMin;
  const endTotalMinutes = endHour * 60 + endMin;
  const totalWindowMinutes = endTotalMinutes - startTotalMinutes;

  if (totalWindowMinutes <= 0) {
    throw new Error("Janela de horário comercial inválida.");
  }

  if (intervalMin > totalWindowMinutes) {
    throw new Error("Intervalo mínimo de minutos é maior que a janela disponível.");
  }

  let currentLeadIndex = 0;
  let currentDate = paraBrasil(new Date()); // instante deslocado — getUTC* dão o horário de Brasília

  interface FollowupFilaItem {
    lead_id: string;
    regra_id: string;
    mensagem_texto: string;
    midia_url: string | null;
    tipo: string;
    agendado_para: string;
    status: string;
    tentativas: number;
  }

  const queuedItems: FollowupFilaItem[] = [];

  while (currentLeadIndex < leadIds.length) {
    // Check if currentDate is eligible
    if (!isEligibleDay(currentDate, diasSemana)) {
      currentDate = getNextEligibleDay(currentDate, diasSemana);
      continue;
    }

    // Generate slots for currentDate, com intervalo aleatório entre
    // intervalMin e intervalMax minutos (evita cadência robótica).
    const slots: Date[] = [];
    for (let offset = 0; offset < totalWindowMinutes; offset += randomInterval(intervalMin, intervalMax)) {
      const slotDate = horarioBrasilParaUTC(currentDate, startHour, startMin);
      slotDate.setUTCMinutes(slotDate.getUTCMinutes() + offset);

      // Only schedule in the future
      if (slotDate.getTime() > Date.now()) {
        slots.push(slotDate);
      }
    }

    if (slots.length === 0) {
      // If no future slots are available today, move to the next eligible day
      currentDate = getNextEligibleDay(currentDate, diasSemana);
      continue;
    }

    // Shuffle slots
    const shuffledSlots = shuffle(slots);

    // Assign leads to slots
    const leadsToAssign = Math.min(leadIds.length - currentLeadIndex, shuffledSlots.length);
    for (let k = 0; k < leadsToAssign; k++) {
      const leadId = leadIds[currentLeadIndex];
      const scheduledTime = shuffledSlots[k];

      queuedItems.push({
        lead_id: leadId,
        regra_id: regraId,
        mensagem_texto: texto,
        midia_url: midiaUrl,
        tipo: tipo,
        agendado_para: scheduledTime.toISOString(),
        status: "pendente",
        tentativas: 0,
      });

      currentLeadIndex++;
    }

    // Move to next day for remaining leads
    if (currentLeadIndex < leadIds.length) {
      currentDate = getNextEligibleDay(currentDate, diasSemana);
    }
  }

  // Insert queued items in bulk
  if (queuedItems.length > 0) {
    const { error: insertError } = await supabase
      .from("followup_fila")
      .insert(queuedItems);

    if (insertError) {
      throw new Error(`Erro ao salvar fila de follow-up: ${insertError.message}`);
    }
  }

  return queuedItems.length;
}

export function randomInterval(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface FollowupPrevisto {
  lead_id: string;
  lead_nome: string;
  lead_numero_whatsapp: string;
  regra_id: string;
  regra_nome: string;
  mensagem_texto: string;
  /** Início da janela do dia previsto — usado só pra ordenar/filtrar, não é o horário exato de envio. */
  previsto_para: string;
  /** Fim da janela do dia previsto (horario_fim da regra). */
  previsto_ate: string;
}

/**
 * Leads que já estão no estágio-gatilho de alguma regra ativa mas ainda não
 * completaram os dias_espera (por isso não têm linha real em followup_fila
 * — agendarFollowupsParaRegra só cria a linha quando o lead já está
 * elegível AGORA). Calculado sob demanda, sem gravar nada no banco, só pra
 * dar visibilidade do que "está por vir" na fila e no painel da conversa.
 */
export async function calcularFollowupsPrevistos(leadId?: string): Promise<FollowupPrevisto[]> {
  const supabase = supabaseAdmin();

  const { data: regras } = await supabase
    .from("followup_regras")
    .select("*, mensagens_rapidas(*)")
    .eq("ativo", true);

  if (!regras || regras.length === 0) return [];

  const previstos: FollowupPrevisto[] = [];

  for (const regra of regras) {
    let query = supabase
      .from("leads")
      .select("id, nome, numero_whatsapp, estagio_atualizado_em")
      .eq("estagio", regra.estagio_gatilho)
      .eq("status", "ativo");
    if (leadId) query = query.eq("id", leadId);

    const { data: leads } = await query;
    if (!leads || leads.length === 0) continue;

    const { data: sent } = await supabase
      .from("followups_enviados")
      .select("lead_id")
      .eq("regra_id", regra.id);
    const sentIds = new Set((sent ?? []).map((s) => s.lead_id));

    const { data: queued } = await supabase
      .from("followup_fila")
      .select("lead_id")
      .eq("regra_id", regra.id)
      .in("status", ["pendente", "enviado", "cancelado"]);
    const queuedIds = new Set((queued ?? []).map((q) => q.lead_id));

    let texto = regra.mensagem_texto || "";
    if (regra.mensagens_rapidas) texto = regra.mensagens_rapidas.conteudo || "";

    for (const lead of leads) {
      if (sentIds.has(lead.id) || queuedIds.has(lead.id)) continue;

      // O horário exato só é decidido de verdade quando o lead vira elegível
      // (scheduleFollowups sorteia um slot dentro da janela horario_inicio-
      // horario_fim, junto com os outros leads elegíveis naquele momento).
      // Aqui mostramos a JANELA inteira em vez de um horário fixo — senão
      // todo lead aparece "cravado" no mesmo horário, o que não reflete o
      // sorteio anti-robotização real.
      const diaBrasil = paraBrasil(new Date(lead.estagio_atualizado_em));
      diaBrasil.setUTCDate(diaBrasil.getUTCDate() + regra.dias_espera);
      const [hi, mi] = (regra.horario_inicio || "08:00").split(":").map(Number);
      const [hf, mf] = (regra.horario_fim || "18:00").split(":").map(Number);
      const previstoPara = horarioBrasilParaUTC(diaBrasil, hi, mi);
      const previstoAte = horarioBrasilParaUTC(diaBrasil, hf, mf);

      previstos.push({
        lead_id: lead.id,
        lead_nome: lead.nome || "Lead",
        lead_numero_whatsapp: lead.numero_whatsapp || "",
        regra_id: regra.id,
        regra_nome: regra.nome,
        mensagem_texto: texto,
        previsto_para: previstoPara.toISOString(),
        previsto_ate: previstoAte.toISOString(),
      });
    }
  }

  return previstos;
}

/** `date` deve ser um instante já deslocado por paraBrasil() — usa getUTCDay pra não depender do fuso do servidor. */
export function isEligibleDay(date: Date, diasSemana: string[]): boolean {
  const dayNum = date.getUTCDay();
  const dayStr = dayNum === 0 ? "7" : String(dayNum);
  return diasSemana.includes(dayStr) || diasSemana.includes(String(dayNum));
}

/** `date` deve ser um instante já deslocado por paraBrasil(); retorna outro instante no mesmo "fuso deslocado". */
export function getNextEligibleDay(date: Date, diasSemana: string[]): Date {
  const next = new Date(date);
  while (true) {
    next.setUTCDate(next.getUTCDate() + 1);
    const dayNum = next.getUTCDay();
    const dayStr = dayNum === 0 ? "7" : String(dayNum);
    if (diasSemana.includes(dayStr) || diasSemana.includes(String(dayNum))) {
      return next;
    }
  }
}
