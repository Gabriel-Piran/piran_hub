import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import type { MensagemRapidaTipo } from "@/types";

const COLUMNS =
  "id, titulo, tipo, conteudo, midia_url, atalho, departamento_id, ativo, criado_por, criado_em";

const TIPOS: MensagemRapidaTipo[] = ["texto", "audio", "video", "imagem"];

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
  if ("titulo" in body) updates.titulo = String(body.titulo).trim();
  if ("tipo" in body) {
    if (!TIPOS.includes(body.tipo as MensagemRapidaTipo)) {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }
    updates.tipo = body.tipo;
  }
  if ("conteudo" in body) updates.conteudo = body.conteudo;
  if ("midia_url" in body) updates.midia_url = body.midia_url;
  if ("atalho" in body) updates.atalho = body.atalho || null;
  if ("departamento_id" in body) updates.departamento_id = body.departamento_id;
  if ("ativo" in body) updates.ativo = Boolean(body.ativo);

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("mensagens_rapidas")
    .update(updates)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    const message =
      error.code === "23505" ? "Já existe uma mensagem com esse atalho" : error.message;
    return NextResponse.json({ error: message }, { status });
  }

  if (!data) {
    return NextResponse.json({ error: "Mensagem rápida não encontrada" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("mensagens_rapidas").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
