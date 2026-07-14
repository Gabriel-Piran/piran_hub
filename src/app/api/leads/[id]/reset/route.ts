import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { LEAD_ESTAGIOS } from "@/types";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = supabaseAdmin();

  const { data: primeiroEstagio } = await supabase
    .from("estagios_customizados")
    .select("slug")
    .order("ordem", { ascending: true })
    .limit(1)
    .maybeSingle();

  const estagioInicial = primeiroEstagio?.slug ?? LEAD_ESTAGIOS[0];

  const { error: deleteError } = await supabase
    .from("mensagens")
    .delete()
    .eq("lead_id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("leads")
    .update({
      estagio: estagioInicial,
      modo_atendimento: "ia",
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, nome, estagio, modo_atendimento")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, lead: data });
}
