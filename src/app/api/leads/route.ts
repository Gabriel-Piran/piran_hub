import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { resolveDepartamentoRestricao } from "@/lib/departamentos-acesso";

const LEAD_COLUMNS =
  "id, nome, nome_whatsapp, numero_whatsapp, instancia, estagio, status, modo_atendimento, departamento_id, salario, cpf, data_nascimento, nome_mae, logradouro, numero_end, bairro, cidade, estado, cep, criado_em, atualizado_em, ultima_mensagem_conteudo, ultima_mensagem_enviado_em";

const LEAD_COLUMNS_WITHOUT_MESSAGES =
  "id, nome, nome_whatsapp, numero_whatsapp, instancia, estagio, status, modo_atendimento, departamento_id, salario, cpf, data_nascimento, nome_mae, logradouro, numero_end, bairro, cidade, estado, cep, criado_em, atualizado_em";

function csv(value: string | null): string[] | null {
  if (!value) return null;
  const parts = value.split(",").map((v) => v.trim()).filter(Boolean);
  return parts.length > 0 ? parts : null;
}

interface LeadFilters {
  status: string[] | null;
  instancia: string[] | null;
  estagio: string[] | null;
  departamentoId: string[] | null;
  modoAtendimento: string[] | null;
  criadoDe: string | null;
  criadoAte: string | null;
  contatoDe: string | null;
  contatoAte: string | null;
  temContrato: "sim" | "nao" | null;
  busca: string | null;
}

function parseFilters(searchParams: URLSearchParams): LeadFilters {
  const statusParam = searchParams.get("status");
  const status = statusParam && statusParam !== "todos" ? csv(statusParam) : null;
  const temContratoParam = searchParams.get("tem_contrato");

  return {
    status,
    instancia: csv(searchParams.get("instancia")),
    estagio: csv(searchParams.get("estagio")),
    departamentoId: csv(searchParams.get("departamento_id")),
    modoAtendimento: csv(searchParams.get("modo_atendimento")),
    criadoDe: searchParams.get("criado_de"),
    criadoAte: searchParams.get("criado_ate"),
    contatoDe: searchParams.get("contato_de"),
    contatoAte: searchParams.get("contato_ate"),
    temContrato: temContratoParam === "sim" || temContratoParam === "nao" ? temContratoParam : null,
    busca: searchParams.get("busca"),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, filters: LeadFilters) {
  if (filters.status) query = query.in("status", filters.status);
  if (filters.instancia) query = query.in("instancia", filters.instancia);
  if (filters.estagio) query = query.in("estagio", filters.estagio);
  if (filters.departamentoId) query = query.in("departamento_id", filters.departamentoId);
  if (filters.modoAtendimento) query = query.in("modo_atendimento", filters.modoAtendimento);
  if (filters.criadoDe) query = query.gte("criado_em", filters.criadoDe);
  if (filters.criadoAte) query = query.lte("criado_em", filters.criadoAte);
  if (filters.contatoDe) query = query.gte("atualizado_em", filters.contatoDe);
  if (filters.contatoAte) query = query.lte("atualizado_em", filters.contatoAte);
  if (filters.temContrato === "sim") {
    query = query.in("status", ["contrato_enviado", "contrato_assinado"]);
  } else if (filters.temContrato === "nao") {
    query = query.not("status", "in", "(contrato_enviado,contrato_assinado)");
  }
  if (filters.busca) {
    const term = filters.busca.replace(/[%_]/g, "").trim();
    if (term) query = query.or(`nome.ilike.%${term}%,numero_whatsapp.ilike.%${term}%`);
  }
  return query;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters = parseFilters(searchParams);

  const supabase = supabaseAdmin();

  const departamentoRestricao = await resolveDepartamentoRestricao(request, supabase);
  if (departamentoRestricao && departamentoRestricao.length === 0) {
    return NextResponse.json([]);
  }

  // Tenta consultar a view leads_unicos primeiro
  let query = applyFilters(supabase.from("leads_unicos").select(LEAD_COLUMNS), filters);
  if (departamentoRestricao) query = query.in("departamento_id", departamentoRestricao);

  let { data, error } = await query.order("atualizado_em", { ascending: false });

  if (error && error.code === "PGRST205") {
    // Fallback caso a view ainda não exista no banco local
    let fallbackQuery = applyFilters(
      supabase.from("leads").select(LEAD_COLUMNS_WITHOUT_MESSAGES),
      filters
    );
    if (departamentoRestricao) fallbackQuery = fallbackQuery.in("departamento_id", departamentoRestricao);

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

  const leads = (data ?? []).map((lead: any) => ({
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
