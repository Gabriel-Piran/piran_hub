import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

const COLUMNS = "id, nome, estagio_gatilho, palavras_chave, acao_id, prioridade, ativo, criado_em";

export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("regras_condicionais")
    .select(COLUMNS)
    .order("prioridade", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  const estagioGatilho =
    typeof body?.estagio_gatilho === "string" && body.estagio_gatilho ? body.estagio_gatilho : null;
  const palavrasChave = Array.isArray(body?.palavras_chave)
    ? body.palavras_chave.map((p: unknown) => String(p).trim().toLowerCase()).filter(Boolean)
    : [];
  const acaoId = typeof body?.acao_id === "string" ? body.acao_id : null;
  const prioridade = Number.isFinite(Number(body?.prioridade)) ? Number(body.prioridade) : 0;

  if (!nome || palavrasChave.length === 0 || !acaoId) {
    return NextResponse.json(
      { error: "nome, palavras_chave e acao_id são obrigatórios" },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("regras_condicionais")
    .insert({
      nome,
      estagio_gatilho: estagioGatilho,
      palavras_chave: palavrasChave,
      acao_id: acaoId,
      prioridade,
    })
    .select(COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
