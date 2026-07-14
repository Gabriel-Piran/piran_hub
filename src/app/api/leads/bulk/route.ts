import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { resolveDepartamentoRestricao } from "@/lib/departamentos-acesso";
import { LEAD_ESTAGIOS } from "@/types";
import type { LeadEstagio } from "@/types";

type BulkAcao = "estagio" | "departamento" | "arquivar";

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);

  const ids = Array.isArray(body?.ids)
    ? (body.ids as unknown[]).filter((v): v is string => typeof v === "string")
    : [];
  const acao = body?.acao as BulkAcao;
  const valor = typeof body?.valor === "string" ? body.valor : undefined;

  if (ids.length === 0) {
    return NextResponse.json({ error: "ids é obrigatório" }, { status: 400 });
  }
  if (!["estagio", "departamento", "arquivar"].includes(acao)) {
    return NextResponse.json({ error: "acao inválida" }, { status: 400 });
  }
  if (acao !== "arquivar" && !valor) {
    return NextResponse.json({ error: "valor é obrigatório" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  if (acao === "estagio" && valor) {
    const { data: estagioData } = await supabase
      .from("estagios_customizados")
      .select("id")
      .eq("slug", valor)
      .maybeSingle();
    if (!estagioData && !LEAD_ESTAGIOS.includes(valor as LeadEstagio)) {
      return NextResponse.json({ error: "Estágio inválido" }, { status: 400 });
    }
  }

  const departamentoRestricao = await resolveDepartamentoRestricao(request, supabase);
  let targetIds = ids;
  if (departamentoRestricao) {
    const { data: leadsPermitidos } = await supabase
      .from("leads")
      .select("id")
      .in("id", ids)
      .in("departamento_id", departamentoRestricao);
    targetIds = (leadsPermitidos ?? []).map((l) => l.id as string);
    if (targetIds.length === 0) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
  }

  const updates: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  if (acao === "estagio") updates.estagio = valor;
  if (acao === "departamento") updates.departamento_id = valor;
  if (acao === "arquivar") updates.status = "arquivado";

  const { data, error } = await supabase
    .from("leads")
    .update(updates)
    .in("id", targetIds)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ atualizados: data?.length ?? 0 });
}
