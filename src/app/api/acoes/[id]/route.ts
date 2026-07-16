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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if ("nome" in body) updates.nome = String(body.nome).trim();
  if ("slug" in body) updates.slug = String(body.slug).replace(/^@+/, "").toLowerCase();
  if ("descricao" in body) updates.descricao = body.descricao;
  if ("tipo" in body) {
    if (!TIPOS.includes(body.tipo as AcaoTipo)) {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }
    updates.tipo = body.tipo;
  }
  if ("configuracao" in body) updates.configuracao = body.configuracao;
  if ("ativo" in body) updates.ativo = Boolean(body.ativo);

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("acoes")
    .update(updates)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    const message = error.code === "23505" ? "Já existe uma ação com esse slug" : error.message;
    return NextResponse.json({ error: message }, { status });
  }

  if (!data) {
    return NextResponse.json({ error: "Ação não encontrada" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("acoes").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
