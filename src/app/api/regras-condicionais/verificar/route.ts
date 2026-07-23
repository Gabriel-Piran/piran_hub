import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { encontrarAcaoPorRegra } from "@/lib/regras-condicionais";

export async function GET(request: Request) {
  const secret = process.env.INTERNAL_API_SECRET;
  const headerSecret = request.headers.get("x-internal-secret");

  if (!secret || headerSecret !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mensagem = searchParams.get("mensagem") ?? "";
  const estagio = searchParams.get("estagio") ?? "";

  if (!mensagem) {
    return NextResponse.json({ match: false, acao: null });
  }

  const supabase = supabaseAdmin();
  const acao = await encontrarAcaoPorRegra(supabase, mensagem, estagio);

  if (!acao) {
    return NextResponse.json({ match: false, acao: null });
  }

  return NextResponse.json({ match: true, acao });
}
