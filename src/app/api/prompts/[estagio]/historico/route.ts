import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

function isAdmin(request: Request) {
  return request.headers.get("x-user-perfil") === "admin";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ estagio: string }> }
) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { estagio } = await params;

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("prompts_aline_historico")
    .select("id, titulo, descricao, conteudo, ativo, editado_por, criado_em")
    .eq("estagio", estagio)
    .order("criado_em", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
