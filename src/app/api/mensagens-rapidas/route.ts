import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import type { MensagemRapidaTipo } from "@/types";

const COLUMNS =
  "id, titulo, tipo, conteudo, midia_url, atalho, departamento_id, ativo, criado_por, criado_em";

const TIPOS: MensagemRapidaTipo[] = ["texto", "audio", "video", "imagem"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const departamentoId = searchParams.get("departamento_id");

  const supabase = supabaseAdmin();
  let query = supabase.from("mensagens_rapidas").select(COLUMNS);

  if (departamentoId) {
    query = query.or(`departamento_id.eq.${departamentoId},departamento_id.is.null`);
  }

  const { data, error } = await query.order("criado_em", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const titulo = typeof body?.titulo === "string" ? body.titulo.trim() : "";
  const tipo = body?.tipo as MensagemRapidaTipo;
  const conteudo = typeof body?.conteudo === "string" ? body.conteudo : null;
  const midiaUrl = typeof body?.midia_url === "string" ? body.midia_url : null;
  const atalho = typeof body?.atalho === "string" ? body.atalho.trim() : null;
  const departamentoId =
    typeof body?.departamento_id === "string" ? body.departamento_id : null;
  const criadoPor = request.headers.get("x-user-email");

  if (!titulo || !TIPOS.includes(tipo)) {
    return NextResponse.json(
      { error: "título e tipo válido são obrigatórios" },
      { status: 400 }
    );
  }

  if (tipo === "texto" && !conteudo) {
    return NextResponse.json(
      { error: "conteúdo é obrigatório para mensagens de texto" },
      { status: 400 }
    );
  }

  if (tipo !== "texto" && !midiaUrl) {
    return NextResponse.json(
      { error: "midia_url é obrigatória para áudio, vídeo e imagem" },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("mensagens_rapidas")
    .insert({
      titulo,
      tipo,
      conteudo,
      midia_url: midiaUrl,
      atalho: atalho || null,
      departamento_id: departamentoId,
      criado_por: criadoPor,
    })
    .select(COLUMNS)
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    const message =
      error.code === "23505" ? "Já existe uma mensagem com esse atalho" : error.message;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json(data, { status: 201 });
}
