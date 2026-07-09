import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

const LEAD_COLUMNS =
  "id, nome, nome_whatsapp, numero_whatsapp, instancia, estagio, status, modo_atendimento, departamento_id, salario, cpf, data_nascimento, nome_mae, logradouro, numero_end, bairro, cidade, estado, cep, criado_em, atualizado_em, ultima_mensagem_conteudo, ultima_mensagem_enviado_em";

const LEAD_COLUMNS_WITHOUT_MESSAGES =
  "id, nome, nome_whatsapp, numero_whatsapp, instancia, estagio, status, modo_atendimento, departamento_id, salario, cpf, data_nascimento, nome_mae, logradouro, numero_end, bairro, cidade, estado, cep, criado_em, atualizado_em";

const RESTRICTED_PERFIS = ["secretaria", "estagio"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "ativo";
  const instancia = searchParams.get("instancia");
  const estagio = searchParams.get("estagio");
  const departamentoId = searchParams.get("departamento_id");
  const modoAtendimento = searchParams.get("modo_atendimento");
  const perfil = request.headers.get("x-user-perfil");
  const userId = request.headers.get("x-user-id");

  const supabase = supabaseAdmin();
  
  // Tenta consultar a view leads_unicos primeiro
  let query = supabase.from("leads_unicos").select(LEAD_COLUMNS);

  if (status !== "todos") {
    query = query.eq("status", status);
  }
  if (instancia) query = query.eq("instancia", instancia);
  if (estagio) query = query.eq("estagio", estagio);
  if (departamentoId) query = query.eq("departamento_id", departamentoId);
  if (modoAtendimento) query = query.eq("modo_atendimento", modoAtendimento);

  if (perfil && RESTRICTED_PERFIS.includes(perfil) && userId) {
    const { data: vinculos } = await supabase
      .from("usuarios_departamentos")
      .select("departamento_id")
      .eq("usuario_id", userId);

    const departamentoIds = (vinculos ?? []).map((v) => v.departamento_id);
    if (departamentoIds.length === 0) {
      return NextResponse.json([]);
    }
    query = query.in("departamento_id", departamentoIds);
  }

  let { data, error } = await query.order("atualizado_em", { ascending: false });

  if (error && error.code === "PGRST205") {
    // Fallback caso a view ainda não exista no banco local
    let fallbackQuery = supabase.from("leads").select(LEAD_COLUMNS_WITHOUT_MESSAGES);
    if (status !== "todos") {
      fallbackQuery = fallbackQuery.eq("status", status);
    }
    if (instancia) fallbackQuery = fallbackQuery.eq("instancia", instancia);
    if (estagio) fallbackQuery = fallbackQuery.eq("estagio", estagio);
    if (departamentoId) fallbackQuery = fallbackQuery.eq("departamento_id", departamentoId);
    if (modoAtendimento) fallbackQuery = fallbackQuery.eq("modo_atendimento", modoAtendimento);

    if (perfil && RESTRICTED_PERFIS.includes(perfil) && userId) {
      const { data: vinculos } = await supabase
        .from("usuarios_departamentos")
        .select("departamento_id")
        .eq("usuario_id", userId);

      const departamentoIds = (vinculos ?? []).map((v) => v.departamento_id);
      if (departamentoIds.length === 0) {
        return NextResponse.json([]);
      }
      fallbackQuery = fallbackQuery.in("departamento_id", departamentoIds);
    }

    const { data: leadsData, error: leadsError } = await fallbackQuery.order("atualizado_em", { ascending: false });
    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    // Agrupamento manual por numero_whatsapp (SELECT DISTINCT ON (numero_whatsapp))
    const seen = new Set();
    const uniqueLeads: any[] = [];
    for (const lead of (leadsData ?? [])) {
      if (!seen.has(lead.numero_whatsapp)) {
        seen.add(lead.numero_whatsapp);
        uniqueLeads.push(lead);
      }
    }

    // Busca a mensagem mais recente de cada lead para o preview
    const leadIds = uniqueLeads.map((l) => l.id);
    if (leadIds.length > 0) {
      const { data: msgs } = await supabase
        .from("mensagens")
        .select("lead_id, conteudo, enviado_em")
        .in("lead_id", leadIds)
        .order("enviado_em", { ascending: false });

      const latestMsgsByLead: Record<string, any> = {};
      for (const m of (msgs ?? [])) {
        if (!latestMsgsByLead[m.lead_id]) {
          latestMsgsByLead[m.lead_id] = m;
        }
      }

      for (const lead of uniqueLeads) {
        const lastMsg = latestMsgsByLead[lead.id];
        lead.ultima_mensagem_conteudo = lastMsg ? lastMsg.conteudo : "";
        lead.ultima_mensagem_enviado_em = lastMsg ? lastMsg.enviado_em : null;
      }
    }

    data = uniqueLeads;
  } else if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const leads = (data ?? []).map((lead) => ({
    ...lead,
    nome: lead.nome || "",
    numero_whatsapp: lead.numero_whatsapp || "",
    estagio: lead.estagio || "RECEPCAO",
    status: lead.status || "ativo",
    ultima_mensagem_conteudo: lead.ultima_mensagem_conteudo || "",
    ultima_mensagem_enviado_em: lead.ultima_mensagem_enviado_em || null,
  }));

  return NextResponse.json(leads);
}
