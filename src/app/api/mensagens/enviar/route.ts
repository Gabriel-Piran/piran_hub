import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { zapiConfig } from "@/lib/zapi";

const ZAPI_ENDPOINT_POR_TIPO: Record<string, { path: string; field: string }> = {
  texto: { path: "send-text", field: "message" },
  audio: { path: "send-audio", field: "audio" },
  video: { path: "send-video", field: "video" },
  imagem: { path: "send-image", field: "image" },
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const leadId = typeof body?.lead_id === "string" ? body.lead_id : "";
  const mensagem = typeof body?.mensagem === "string" ? body.mensagem.trim() : "";
  const tipo = typeof body?.tipo === "string" ? body.tipo : "texto";

  if (!leadId || !mensagem) {
    return NextResponse.json(
      { error: "lead_id e mensagem são obrigatórios" },
      { status: 400 }
    );
  }

  const endpoint = ZAPI_ENDPOINT_POR_TIPO[tipo] ?? ZAPI_ENDPOINT_POR_TIPO.texto;

  const zapi = zapiConfig();
  if (!zapi) {
    return NextResponse.json(
      { error: "Z-API não configurada" },
      { status: 500 }
    );
  }

  const supabase = supabaseAdmin();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, numero_whatsapp")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
  }

  const zapiRes = await fetch(`${zapi.baseUrl}/${endpoint.path}`, {
    method: "POST",
    headers: zapi.headers,
    body: JSON.stringify({
      phone: lead.numero_whatsapp,
      [endpoint.field]: mensagem,
    }),
  });

  if (!zapiRes.ok) {
    const errText = await zapiRes.text().catch(() => "");
    return NextResponse.json(
      { error: `Falha ao enviar via Z-API: ${errText || zapiRes.status}` },
      { status: 502 }
    );
  }

  const { data: saved, error: saveError } = await supabase
    .from("mensagens")
    .insert({
      lead_id: leadId,
      conteudo: mensagem,
      role: "sistema",
      tipo,
      enviado_em: new Date().toISOString(),
      enviado_por_atendente: true,
    })
    .select("id, lead_id, conteudo, role, tipo, enviado_em, enviado_por_atendente")
    .single();

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mensagem: saved });
}
