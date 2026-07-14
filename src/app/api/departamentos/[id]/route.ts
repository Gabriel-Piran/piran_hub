import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

const COLUMNS = "id, nome, descricao, cor, ativo, criado_em";

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
  if ("descricao" in body) updates.descricao = body.descricao;
  if ("cor" in body) updates.cor = body.cor;
  if ("ativo" in body) updates.ativo = Boolean(body.ativo);

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("departamentos")
    .update(updates)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Departamento não encontrado" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("departamentos").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
