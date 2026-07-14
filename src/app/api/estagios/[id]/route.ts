import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

const COLUMNS = "id, nome, slug, cor, icone, ordem, ativo, criado_em";

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
  if ("slug" in body) updates.slug = String(body.slug).trim().toUpperCase();
  if ("cor" in body) updates.cor = body.cor;
  if ("icone" in body) updates.icone = body.icone;
  if ("ordem" in body) updates.ordem = Number(body.ordem);
  if ("ativo" in body) updates.ativo = Boolean(body.ativo);

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("estagios_customizados")
    .update(updates)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    const message = error.code === "23505" ? "Já existe um estágio com esse slug" : error.message;
    return NextResponse.json({ error: message }, { status });
  }

  if (!data) {
    return NextResponse.json({ error: "Estágio não encontrado" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("estagios_customizados").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
