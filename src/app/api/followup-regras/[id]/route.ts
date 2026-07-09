import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

const COLUMNS =
  "id, nome, estagio_gatilho, dias_espera, hora_envio, mensagem_rapida_id, mensagem_texto, ativo, criado_em, horario_inicio, horario_fim, intervalo_minutos_min, intervalo_minutos_max, dias_semana";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if ("nome" in body) updates.nome = String(body.nome).trim();
  if ("estagio_gatilho" in body) updates.estagio_gatilho = body.estagio_gatilho;
  if ("dias_espera" in body) updates.dias_espera = Number(body.dias_espera);
  if ("hora_envio" in body) updates.hora_envio = body.hora_envio;
  if ("mensagem_rapida_id" in body) updates.mensagem_rapida_id = body.mensagem_rapida_id;
  if ("mensagem_texto" in body) updates.mensagem_texto = body.mensagem_texto;
  if ("ativo" in body) updates.ativo = Boolean(body.ativo);
  if ("horario_inicio" in body) updates.horario_inicio = body.horario_inicio;
  if ("horario_fim" in body) updates.horario_fim = body.horario_fim;
  if ("intervalo_minutos_min" in body) updates.intervalo_minutos_min = Number(body.intervalo_minutos_min);
  if ("intervalo_minutos_max" in body) updates.intervalo_minutos_max = Number(body.intervalo_minutos_max);
  if ("dias_semana" in body) updates.dias_semana = body.dias_semana;

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("followup_regras")
    .update(updates)
    .eq("id", id)
    .select(COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("followup_regras").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
