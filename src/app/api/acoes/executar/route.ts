import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { executarAcao } from "@/lib/acoes";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const acaoId = typeof body?.acao_id === "string" ? body.acao_id : "";
  const leadId = typeof body?.lead_id === "string" ? body.lead_id : "";

  if (!acaoId || !leadId) {
    return NextResponse.json({ error: "acao_id e lead_id são obrigatórios" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const resultado = await executarAcao(supabase, acaoId, leadId);

  if (!resultado.ok) {
    return NextResponse.json(
      { error: resultado.error, detalhe: resultado.resultado },
      { status: resultado.status }
    );
  }

  return NextResponse.json({ ok: true, acao: resultado.acao, resultado: resultado.resultado });
}
