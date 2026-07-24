import { NextResponse } from "next/server";

import { sincronizarFotoPerfil } from "@/lib/foto-perfil";

export async function POST(request: Request) {
  const secret = process.env.INTERNAL_API_SECRET;
  const headerSecret = request.headers.get("x-internal-secret");

  if (!secret || headerSecret !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const leadId = body?.lead_id;

  if (!leadId || typeof leadId !== "string") {
    return NextResponse.json({ error: "lead_id é obrigatório" }, { status: 400 });
  }

  const resultado = await sincronizarFotoPerfil(leadId);
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : resultado.status });
}
