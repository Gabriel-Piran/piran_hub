import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { deletarLeadCompleto } from "@/lib/leads-restart";

export async function POST(request: Request) {
  const secret = process.env.INTERNAL_API_SECRET;
  const headerSecret = request.headers.get("x-internal-secret");

  if (!secret || headerSecret !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const numeroWhatsapp = typeof body?.numero_whatsapp === "string" ? body.numero_whatsapp : "";

  if (!numeroWhatsapp) {
    return NextResponse.json({ error: "numero_whatsapp é obrigatório" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id")
    .eq("numero_whatsapp", numeroWhatsapp)
    .maybeSingle();

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 });
  }
  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
  }

  const resultado = await deletarLeadCompleto(supabase, lead.id);

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: resultado.status });
  }

  return NextResponse.json({ success: true, deletado: true });
}
