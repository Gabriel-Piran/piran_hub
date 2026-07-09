import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { LEAD_ESTAGIOS } from "@/types";
import type { LeadEstagio } from "@/types";

const PROMPT_COLUMNS = "id, estagio, titulo, descricao, conteudo, ativo, atualizado_em";

function isAdmin(request: Request) {
  return request.headers.get("x-user-perfil") === "admin";
}

async function notificarN8n(): Promise<boolean> {
  const url = process.env.N8N_SINCRONIZAR_PROMPTS_URL;
  if (!url) return false;

  try {
    const res = await fetch(url, { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ estagio: string }> }
) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { estagio } = await params;
  if (!LEAD_ESTAGIOS.includes(estagio as LeadEstagio)) {
    return NextResponse.json({ error: "Estágio inválido" }, { status: 400 });
  }

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
  const { data, error } = await supabase
    .from("prompts_aline")
    .update(updates)
    .eq("estagio", estagio)
    .select(PROMPT_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sincronizado = await notificarN8n();

  return NextResponse.json({ ...data, sincronizado });
}
