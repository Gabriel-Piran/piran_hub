import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

const COLUMNS = "id, nome, slug, cor, icone, ordem, ativo, criado_em";

export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("estagios_customizados")
    .select(COLUMNS)
    .order("ordem", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  const slug = typeof body?.slug === "string" ? body.slug.trim().toUpperCase() : "";
  const cor = typeof body?.cor === "string" ? body.cor : "#6b7280";
  const icone = typeof body?.icone === "string" ? body.icone : null;

  if (!nome || !slug) {
    return NextResponse.json({ error: "nome e slug são obrigatórios" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const { data: maxOrdemRow } = await supabase
    .from("estagios_customizados")
    .select("ordem")
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const ordem = (maxOrdemRow?.ordem ?? 0) + 1;

  const { data, error } = await supabase
    .from("estagios_customizados")
    .insert({ nome, slug, cor, icone, ordem })
    .select(COLUMNS)
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    const message = error.code === "23505" ? "Já existe um estágio com esse slug" : error.message;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json(data, { status: 201 });
}
