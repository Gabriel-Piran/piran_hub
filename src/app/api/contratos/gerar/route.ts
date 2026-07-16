import { NextResponse } from "next/server";

import { gerarContrato } from "@/lib/contratos";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const leadId = typeof body?.lead_id === "string" ? body.lead_id : "";

  if (!leadId) {
    return NextResponse.json({ error: "lead_id é obrigatório" }, { status: 400 });
  }

  const resultado = await gerarContrato(leadId);

  if (!resultado.ok) {
    return NextResponse.json(
      { error: resultado.error, detalhe: resultado.resultado },
      { status: resultado.status }
    );
  }

  return NextResponse.json({ ok: true, resultado: resultado.resultado });
}
