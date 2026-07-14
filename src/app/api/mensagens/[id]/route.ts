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
  const acaoExecutada = body?.acao_executada;

  if (acaoExecutada !== "cancelado") {
    return NextResponse.json(
      { error: "acao_executada deve ser 'cancelado'" },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("mensagens")
    .update({ acao_executada: "cancelado" })
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
