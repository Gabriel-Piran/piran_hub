import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import type { AcaoTipo } from "@/types";

const COLUMNS = "id, nome, slug, descricao, tipo, configuracao, ativo, criado_em";

const TIPOS: AcaoTipo[] = [
  "estagio",
  "status",
  "mensagem",
  "webhook",
  "transferir",
  "arquivar",
  "contrato",
];

export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("acoes")
    .select(COLUMNS)
    .order("criado_em", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  const slugBruto = typeof body?.slug === "string" ? body.slug.trim() : "";
  const slug = slugBruto.replace(/^@+/, "").toLowerCase();
  const descricao = typeof body?.descricao === "string" ? body.descricao.trim() : null;
  const tipo = body?.tipo as AcaoTipo;
  const configuracao =
    body?.configuracao && typeof body.configuracao === "object" ? body.configuracao : {};

  if (!nome || !slug || !TIPOS.includes(tipo)) {
    return NextResponse.json(
      { error: "nome, slug e tipo válidos são obrigatórios" },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("acoes")
    .insert({ nome, slug, descricao, tipo, configuracao })
    .select(COLUMNS)
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    const message = error.code === "23505" ? "Já existe uma ação com esse slug" : error.message;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json(data, { status: 201 });
}
