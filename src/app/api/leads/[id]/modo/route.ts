import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import type { ModoAtendimento } from "@/types";

const MODOS: ModoAtendimento[] = ["ia", "humano", "pendente"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const modo = body?.modo as ModoAtendimento;

  if (!MODOS.includes(modo)) {
    return NextResponse.json({ error: "Modo inválido" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("leads")
    .update({ modo_atendimento: modo, atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .select("id, nome, modo_atendimento")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
  }

  if (modo === "pendente") {
    await supabase.from("mensagens").insert({
      lead_id: id,
      conteudo: `Conversa marcada como pendente`,
      role: "sistema",
      tipo: "texto",
      enviado_em: new Date().toISOString(),
    });
  }

  return NextResponse.json(data);
}
