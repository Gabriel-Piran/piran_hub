import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const usuarioId = typeof body?.usuario_id === "string" ? body.usuario_id : "";

  if (!usuarioId) {
    return NextResponse.json({ error: "usuario_id é obrigatório" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("usuarios_departamentos")
    .upsert({ usuario_id: usuarioId, departamento_id: id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const usuarioId = searchParams.get("usuario_id");

  if (!usuarioId) {
    return NextResponse.json({ error: "usuario_id é obrigatório" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("usuarios_departamentos")
    .delete()
    .eq("departamento_id", id)
    .eq("usuario_id", usuarioId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
