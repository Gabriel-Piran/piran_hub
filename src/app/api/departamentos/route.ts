import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

const COLUMNS = "id, nome, descricao, cor, ativo, criado_em";

export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("departamentos")
    .select(COLUMNS)
    .order("nome", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  const descricao = typeof body?.descricao === "string" ? body.descricao : null;
  const cor = typeof body?.cor === "string" ? body.cor : "#c9a84c";

  if (!nome) {
    return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("departamentos")
    .insert({ nome, descricao, cor })
    .select(COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
