import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

const COLUMNS =
  "id, nome, estagio_gatilho, dias_espera, hora_envio, mensagem_rapida_id, mensagem_texto, ativo, criado_em, horario_inicio, horario_fim, intervalo_minutos_min, intervalo_minutos_max, dias_semana";

export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("followup_regras")
    .select(COLUMNS)
    .order("criado_em", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  const estagioGatilho =
    typeof body?.estagio_gatilho === "string" ? body.estagio_gatilho : "";
  const diasEspera = Number(body?.dias_espera);
  const horaEnvio = typeof body?.hora_envio === "string" ? body.hora_envio : "09:00";
  const mensagemRapidaId =
    typeof body?.mensagem_rapida_id === "string" ? body.mensagem_rapida_id : null;
  const mensagemTexto =
    typeof body?.mensagem_texto === "string" ? body.mensagem_texto : null;

  const horarioInicio = typeof body?.horario_inicio === "string" ? body.horario_inicio : "08:00";
  const horarioFim = typeof body?.horario_fim === "string" ? body.horario_fim : "18:00";
  const intervaloMinutosMin = Number(body?.intervalo_minutos_min ?? 1);
  const intervaloMinutosMax = Number(body?.intervalo_minutos_max ?? 5);
  const diasSemana = Array.isArray(body?.dias_semana) ? body.dias_semana : ["1", "2", "3", "4", "5"];

  if (!nome || !estagioGatilho || !Number.isFinite(diasEspera) || diasEspera < 0) {
    return NextResponse.json(
      { error: "nome, estagio_gatilho e dias_espera válidos são obrigatórios" },
      { status: 400 }
    );
  }

  if (!mensagemRapidaId && !mensagemTexto) {
    return NextResponse.json(
      { error: "informe mensagem_rapida_id ou mensagem_texto" },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("followup_regras")
    .insert({
      nome,
      estagio_gatilho: estagioGatilho,
      dias_espera: diasEspera,
      hora_envio: horaEnvio,
      mensagem_rapida_id: mensagemRapidaId,
      mensagem_texto: mensagemTexto,
      horario_inicio: horarioInicio,
      horario_fim: horarioFim,
      intervalo_minutos_min: intervaloMinutosMin,
      intervalo_minutos_max: intervaloMinutosMax,
      dias_semana: diasSemana,
    })
    .select(COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
