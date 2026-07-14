import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

const COLUMNS =
  "id, lead_id, conteudo, role, tipo, enviado_em, agendado_para, nota_interna, acao_executada";

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

  if ("acao_executada" in body) {
    if (body.acao_executada !== "cancelado") {
      return NextResponse.json(
        { error: "acao_executada deve ser 'cancelado'" },
        { status: 400 }
      );
    }
    updates.acao_executada = "cancelado";
  }

  // Edição de mensagem agendada (texto e/ou horário) ainda não enviada.
  if ("conteudo" in body) updates.conteudo = String(body.conteudo ?? "").trim();
  if ("agendado_para" in body) updates.agendado_para = body.agendado_para;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("mensagens")
    .update(updates)
    .eq("id", id)
    .is("acao_executada", null)
    .select(COLUMNS)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Mensagem não encontrada ou já processada" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}
