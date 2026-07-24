import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

const COLUMNS =
  "id, categoria, titulo, quando_usar, exemplos_frases, resposta_modelo, ordem, ativo, criado_em, atualizado_em";

export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("base_conhecimento")
    .select(COLUMNS)
    .order("categoria", { ascending: true })
    .order("ordem", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const categoria = typeof body?.categoria === "string" ? body.categoria.trim() : "";
  const titulo = typeof body?.titulo === "string" ? body.titulo.trim() : "";
  const quandoUsar = typeof body?.quando_usar === "string" ? body.quando_usar.trim() : "";
  const respostaModelo = typeof body?.resposta_modelo === "string" ? body.resposta_modelo.trim() : "";
  const exemplosFrases = Array.isArray(body?.exemplos_frases)
    ? body.exemplos_frases.map((f: unknown) => String(f).trim()).filter(Boolean)
    : [];
  const ordem = Number.isFinite(Number(body?.ordem)) ? Number(body.ordem) : 0;

  if (!categoria || !titulo || !quandoUsar || !respostaModelo) {
    return NextResponse.json(
      { error: "categoria, titulo, quando_usar e resposta_modelo são obrigatórios" },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("base_conhecimento")
    .insert({
      categoria,
      titulo,
      quando_usar: quandoUsar,
      exemplos_frases: exemplosFrases,
      resposta_modelo: respostaModelo,
      ordem,
    })
    .select(COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
