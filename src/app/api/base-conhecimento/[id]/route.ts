import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

const COLUMNS =
  "id, categoria, titulo, quando_usar, exemplos_frases, resposta_modelo, ordem, ativo, criado_em, atualizado_em";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  if ("categoria" in body) updates.categoria = String(body.categoria).trim();
  if ("titulo" in body) updates.titulo = String(body.titulo).trim();
  if ("quando_usar" in body) updates.quando_usar = String(body.quando_usar).trim();
  if ("resposta_modelo" in body) updates.resposta_modelo = String(body.resposta_modelo).trim();
  if ("ordem" in body) updates.ordem = Number(body.ordem) || 0;
  if ("ativo" in body) updates.ativo = Boolean(body.ativo);
  if ("exemplos_frases" in body) {
    updates.exemplos_frases = Array.isArray(body.exemplos_frases)
      ? body.exemplos_frases.map((f: unknown) => String(f).trim()).filter(Boolean)
      : [];
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("base_conhecimento")
    .update(updates)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Tópico não encontrado" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("base_conhecimento").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
