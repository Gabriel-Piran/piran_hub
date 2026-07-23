import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

const PROMPT_COLUMNS = "id, estagio, titulo, descricao, conteudo, ativo, atualizado_em";

function isAdmin(request: Request) {
  return request.headers.get("x-user-perfil") === "admin";
}

// A Aline (node "Busca Prompt" do workflow n8n) lê o conteúdo desta tabela
// direto do Postgres a cada mensagem — não existe cache nem webhook de
// sincronização a acionar aqui; salvar já é o suficiente para valer na
// próxima mensagem do lead.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ estagio: string }> }
) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { estagio } = await params;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  if ("titulo" in body) updates.titulo = String(body.titulo).trim();
  if ("descricao" in body) updates.descricao = String(body.descricao ?? "");
  if ("conteudo" in body) updates.conteudo = String(body.conteudo ?? "");
  if ("ativo" in body) updates.ativo = Boolean(body.ativo);

  const supabase = supabaseAdmin();

  const { data: atual } = await supabase
    .from("prompts_aline")
    .select(PROMPT_COLUMNS)
    .eq("estagio", estagio)
    .maybeSingle();

  if (atual) {
    await supabase.from("prompts_aline_historico").insert({
      prompt_id: atual.id,
      estagio: atual.estagio,
      titulo: atual.titulo,
      descricao: atual.descricao,
      conteudo: atual.conteudo,
      ativo: atual.ativo,
      editado_por: request.headers.get("x-user-email"),
    });
  }

  const { data, error } = await supabase
    .from("prompts_aline")
    .update(updates)
    .eq("estagio", estagio)
    .select(PROMPT_COLUMNS)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Prompt não encontrado para esse estágio" }, { status: 404 });
  }

  return NextResponse.json(data);
}
