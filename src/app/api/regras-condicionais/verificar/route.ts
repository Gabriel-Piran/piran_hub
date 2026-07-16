import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  const secret = process.env.INTERNAL_API_SECRET;
  const headerSecret = request.headers.get("x-internal-secret");

  if (!secret || headerSecret !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mensagem = (searchParams.get("mensagem") ?? "").toLowerCase();
  const estagio = searchParams.get("estagio") ?? "";

  if (!mensagem) {
    return NextResponse.json({ match: false, acao: null });
  }

  const supabase = supabaseAdmin();

  const { data: regras, error } = await supabase
    .from("regras_condicionais")
    .select("id, estagio_gatilho, palavras_chave, acao_id, prioridade, ativo")
    .eq("ativo", true)
    .order("prioridade", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const regraCorrespondente = (regras ?? []).find((regra) => {
    if (regra.estagio_gatilho && regra.estagio_gatilho !== estagio) return false;
    const palavras = Array.isArray(regra.palavras_chave) ? regra.palavras_chave : [];
    return palavras.some((palavra: string) => mensagem.includes(String(palavra).toLowerCase()));
  });

  if (!regraCorrespondente || !regraCorrespondente.acao_id) {
    return NextResponse.json({ match: false, acao: null });
  }

  const { data: acao, error: acaoError } = await supabase
    .from("acoes")
    .select("slug, tipo, configuracao")
    .eq("id", regraCorrespondente.acao_id)
    .eq("ativo", true)
    .maybeSingle();

  if (acaoError) {
    return NextResponse.json({ error: acaoError.message }, { status: 500 });
  }

  if (!acao) {
    return NextResponse.json({ match: false, acao: null });
  }

  return NextResponse.json({ match: true, acao });
}
