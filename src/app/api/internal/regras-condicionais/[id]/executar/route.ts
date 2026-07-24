import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { executarAcao } from "@/lib/acoes";

/**
 * Executa a ação vinculada a uma regra condicional específica, direto
 * pelo id da regra — usado pela Aline (n8n) quando ELA decide acionar
 * uma regra condicional (ex.: fallback de dúvida fora da base de
 * conhecimento), sem depender de casar palavra-chave no texto do lead.
 * Se a ação vinculada à regra mudar na tela de Configurações, o
 * comportamento muda junto, sem precisar editar o workflow do n8n.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const secret = process.env.INTERNAL_API_SECRET;
  const headerSecret = request.headers.get("x-internal-secret");

  if (!secret || headerSecret !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const leadId = typeof body?.lead_id === "string" ? body.lead_id : "";

  if (!leadId) {
    return NextResponse.json({ error: "lead_id é obrigatório" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const { data: regra, error: regraError } = await supabase
    .from("regras_condicionais")
    .select("id, nome, acao_id, ativo")
    .eq("id", id)
    .maybeSingle();

  if (regraError) {
    return NextResponse.json({ error: regraError.message }, { status: 500 });
  }
  if (!regra || !regra.ativo || !regra.acao_id) {
    return NextResponse.json({ error: "Regra não encontrada, inativa ou sem ação vinculada" }, { status: 404 });
  }

  const resultado = await executarAcao(supabase, regra.acao_id, leadId);

  if (!resultado.ok) {
    return NextResponse.json(
      { error: resultado.error, detalhe: resultado.resultado },
      { status: resultado.status }
    );
  }

  return NextResponse.json({ ok: true, regra: regra.nome, acao: resultado.acao, resultado: resultado.resultado });
}
