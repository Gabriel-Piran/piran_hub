import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { zapiConfig, type ZapiInstancia } from "@/lib/zapi";
import { shuffle, isEligibleDay, getNextEligibleDay } from "@/lib/followup-scheduler";
import { autorizadoCron } from "@/lib/cron";

async function calcularProximoAgendamento(
  regra: {
    dias_espera: number;
    horario_inicio: string | null;
    horario_fim: string | null;
    intervalo_minutos_min: number | null;
    dias_semana: string[] | null;
  }
): Promise<string> {
  const horarioInicio = regra.horario_inicio || "08:00";
  const horarioFim = regra.horario_fim || "18:00";
  const intervalMin = regra.intervalo_minutos_min || 1;
  const diasSemana = regra.dias_semana || ["1", "2", "3", "4", "5"];

  const [startHour, startMin] = horarioInicio.split(":").map(Number);
  const [endHour, endMin] = horarioFim.split(":").map(Number);
  const totalWindowMinutes = endHour * 60 + endMin - (startHour * 60 + startMin);
  const slotsPerDay = Math.max(1, Math.floor(totalWindowMinutes / intervalMin));

  let currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + Math.max(1, regra.dias_espera));

  while (true) {
    if (!isEligibleDay(currentDate, diasSemana)) {
      currentDate = getNextEligibleDay(currentDate, diasSemana);
      continue;
    }

    const slots: Date[] = [];
    for (let i = 0; i < slotsPerDay; i++) {
      const slotDate = new Date(currentDate);
      slotDate.setHours(startHour, startMin, 0, 0);
      slotDate.setMinutes(slotDate.getMinutes() + i * intervalMin);
      if (slotDate.getTime() > Date.now()) {
        slots.push(slotDate);
      }
    }

    if (slots.length === 0) {
      currentDate = getNextEligibleDay(currentDate, diasSemana);
      continue;
    }

    const [proximoSlot] = shuffle(slots);
    return proximoSlot.toISOString();
  }
}

async function processarFila() {
  const supabase = supabaseAdmin();

  const { data: items, error: itemsError } = await supabase
    .from("followup_fila")
    .select("*, leads(numero_whatsapp, instancia)")
    .eq("status", "pendente")
    .lte("agendado_para", new Date().toISOString())
    .lt("tentativas", 3)
    .limit(5);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  let enviadas = 0;
  let erros = 0;
  let proximas_agendadas = 0;

  for (const item of items ?? []) {
    const leadInfo = Array.isArray(item.leads) ? item.leads[0] : item.leads;
    const phone = leadInfo?.numero_whatsapp;
    const instancia = leadInfo?.instancia as ZapiInstancia | undefined;

    const zapi = zapiConfig(instancia);

    if (!phone || !zapi) {
      erros += 1;
      await supabase
        .from("followup_fila")
        .update({
          status: "erro",
          erro_mensagem: !phone ? "Lead sem número de WhatsApp" : "Z-API não configurada para a instância",
          tentativas: item.tentativas + 1,
        })
        .eq("id", item.id);
      continue;
    }

    let zapiPath = "send-text";
    const zapiBody: Record<string, unknown> = { phone };

    if (item.tipo === "audio" && item.midia_url) {
      zapiPath = "send-audio";
      zapiBody.audio = item.midia_url;
      zapiBody.extension = "ogg";
    } else if (item.tipo === "imagem" && item.midia_url) {
      zapiPath = "send-image";
      zapiBody.image = item.midia_url;
      zapiBody.caption = item.mensagem_texto || "";
    } else if (item.tipo === "video" && item.midia_url) {
      zapiPath = "send-video";
      zapiBody.video = item.midia_url;
      zapiBody.caption = item.mensagem_texto || "";
    } else if (item.tipo === "documento" && item.midia_url) {
      zapiPath = "send-document";
      zapiBody.document = item.midia_url;
      zapiBody.fileName = "Documento";
    } else {
      zapiPath = "send-text";
      zapiBody.message = item.mensagem_texto || "";
    }

    try {
      const zapiRes = await fetch(`${zapi.baseUrl}/${zapiPath}`, {
        method: "POST",
        headers: zapi.headers,
        body: JSON.stringify(zapiBody),
      });

      if (!zapiRes.ok) {
        const errText = await zapiRes.text().catch(() => "");
        const novasTentativas = item.tentativas + 1;
        const novoStatus = novasTentativas >= 3 ? "erro" : "pendente";

        await supabase
          .from("followup_fila")
          .update({
            status: novoStatus,
            tentativas: novasTentativas,
            erro_mensagem: `Z-API retornou ${zapiRes.status}: ${errText}`,
          })
          .eq("id", item.id);

        erros += 1;
        continue;
      }

      const now = new Date().toISOString();

      await supabase
        .from("followup_fila")
        .update({
          status: "enviado",
          enviado_em: now,
          tentativas: item.tentativas + 1,
        })
        .eq("id", item.id);

      await supabase
        .from("followups_enviados")
        .upsert(
          { lead_id: item.lead_id, regra_id: item.regra_id, enviado_em: now },
          { onConflict: "lead_id,regra_id" }
        );

      await supabase.from("mensagens").insert({
        lead_id: item.lead_id,
        conteudo: item.mensagem_texto || "",
        role: "assistente",
        tipo: "texto",
        enviado_em: now,
        acao_executada: "FUP_ENVIADO",
      });

      enviadas += 1;

      if (item.regra_id) {
        const { data: regra } = await supabase
          .from("followup_regras")
          .select("dias_espera, horario_inicio, horario_fim, intervalo_minutos_min, dias_semana, max_sequencias")
          .eq("id", item.regra_id)
          .maybeSingle();

        if (regra && item.sequencia_atual < regra.max_sequencias) {
          const proximoAgendadoPara = await calcularProximoAgendamento(regra);

          const { error: insertError } = await supabase.from("followup_fila").insert({
            lead_id: item.lead_id,
            regra_id: item.regra_id,
            mensagem_texto: item.mensagem_texto,
            midia_url: item.midia_url,
            tipo: item.tipo,
            agendado_para: proximoAgendadoPara,
            status: "pendente",
            tentativas: 0,
            sequencia_atual: item.sequencia_atual + 1,
          });

          if (!insertError) {
            proximas_agendadas += 1;
          }
        }
      }
    } catch (err) {
      const novasTentativas = item.tentativas + 1;
      const novoStatus = novasTentativas >= 3 ? "erro" : "pendente";

      await supabase
        .from("followup_fila")
        .update({
          status: novoStatus,
          tentativas: novasTentativas,
          erro_mensagem: (err as Error).message || "Erro de conexão",
        })
        .eq("id", item.id);

      erros += 1;
    }
  }

  return { enviadas, erros, proximas_agendadas };
}

export async function GET(request: Request) {
  if (!autorizadoCron(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const resultado = await processarFila();
  return NextResponse.json(resultado);
}

export async function POST(request: Request) {
  if (!autorizadoCron(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const resultado = await processarFila();
  return NextResponse.json(resultado);
}
