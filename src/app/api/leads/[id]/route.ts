import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { resolveDepartamentoRestricao } from "@/lib/departamentos-acesso";
import { LEAD_ESTAGIOS } from "@/types";
import type { LeadEstagio, LeadStatus } from "@/types";

const LEAD_COLUMNS =
  "id, nome, nome_whatsapp, foto_perfil_url, numero_whatsapp, instancia, estagio, status, modo_atendimento, departamento_id, salario, cpf, data_nascimento, nome_mae, logradouro, numero_end, bairro, cidade, estado, cep, criado_em, atualizado_em";

const UPDATABLE_FIELDS = [
  "nome",
  "nome_whatsapp",
  "numero_whatsapp",
  "instancia",
  "estagio",
  "status",
  "departamento_id",
  "salario",
  "cpf",
  "data_nascimento",
  "nome_mae",
  "logradouro",
  "numero_end",
  "bairro",
  "cidade",
  "estado",
  "cep",
] as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = supabaseAdmin();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("id", id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
  }

  const departamentoRestricao = await resolveDepartamentoRestricao(request, supabase);
  if (
    departamentoRestricao &&
    (!lead.departamento_id || !departamentoRestricao.includes(lead.departamento_id))
  ) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { data: mensagens, error: mensagensError } = await supabase
    .from("mensagens")
    .select(
      "id, lead_id, conteudo, role, tipo, enviado_em, agendado_para, nota_interna, acao_executada, enviado_por_atendente, midia_url"
    )
    .eq("lead_id", id)
    .order("enviado_em", { ascending: true });

  if (mensagensError) {
    return NextResponse.json({ error: mensagensError.message }, { status: 500 });
  }

  const { data: followupsFila } = await supabase
    .from("followup_fila")
    .select("id, mensagem_texto, midia_url, tipo, agendado_para, followup_regras(nome)")
    .eq("lead_id", id)
    .eq("status", "pendente")
    .order("agendado_para", { ascending: true });

  const mensagensAgendadasFollowup = (followupsFila ?? []).map((f) => {
    const regra = Array.isArray(f.followup_regras) ? f.followup_regras[0] : f.followup_regras;
    return {
      id: `followup:${f.id}`,
      lead_id: id,
      conteudo: f.mensagem_texto || "",
      role: "sistema" as const,
      tipo: f.tipo || "texto",
      enviado_em: f.agendado_para,
      agendado_para: f.agendado_para,
      acao_executada: null,
      midia_url: f.midia_url,
      origem: "followup" as const,
      followup_regra_nome: regra?.nome ?? null,
    };
  });

  return NextResponse.json({
    ...lead,
    nome: lead.nome || "",
    numero_whatsapp: lead.numero_whatsapp || "",
    estagio: lead.estagio || "RECEPCAO",
    status: lead.status || "ativo",
    mensagens: (mensagens ?? []).map((m) => ({ ...m, conteudo: m.conteudo || "", origem: "manual" as const })),
    mensagens_agendadas_followup: mensagensAgendadasFollowup,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  if ("estagio" in body) {
    const supabase = supabaseAdmin();
    const { data: estagioData } = await supabase
      .from("estagios_customizados")
      .select("id")
      .eq("slug", body.estagio)
      .maybeSingle();

    if (!estagioData && !LEAD_ESTAGIOS.includes(body.estagio as LeadEstagio)) {
      return NextResponse.json({ error: "Estágio inválido" }, { status: 400 });
    }
  }

  const validStatus: LeadStatus[] = [
    "ativo",
    "desqualificado",
    "transferido",
    "contrato_enviado",
    "contrato_assinado",
    "arquivado",
  ];
  if ("status" in body && !validStatus.includes(body.status as LeadStatus)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  for (const field of UPDATABLE_FIELDS) {
    if (field in body) updates[field] = body[field];
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", id)
    .select(LEAD_COLUMNS)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
  }

  return NextResponse.json(data);
}
