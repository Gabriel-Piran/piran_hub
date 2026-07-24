import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { zapiConfig, type ZapiInstancia } from "@/lib/zapi";

/**
 * Envia uma mensagens_rapidas pelo atalho (ex.: "/horario"), de qualquer
 * tipo (texto, áudio, vídeo, imagem) — usado pela Aline (n8n) quando ELA
 * decide mandar uma mensagem rápida como uma mensagem própria via
 * [ACAO: ENVIAR_RAPIDA=/atalho]. Complementa resolver_atalhos_prompt, que
 * só resolve atalhos de texto embutidos no meio da resposta — mídia
 * precisa ser mandada como mensagem separada pelo Z-API.
 */
const ZAPI_ENDPOINT_POR_TIPO: Record<string, { path: string; field: string }> = {
  texto: { path: "send-text", field: "message" },
  audio: { path: "send-audio", field: "audio" },
  video: { path: "send-video", field: "video" },
  imagem: { path: "send-image", field: "image" },
};

export async function POST(request: Request) {
  const secret = process.env.INTERNAL_API_SECRET;
  const headerSecret = request.headers.get("x-internal-secret");

  if (!secret || headerSecret !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const leadId = typeof body?.lead_id === "string" ? body.lead_id : "";
  const atalho = typeof body?.atalho === "string" ? body.atalho.trim() : "";

  if (!leadId || !atalho) {
    return NextResponse.json({ error: "lead_id e atalho são obrigatórios" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const { data: rapida, error: rapidaError } = await supabase
    .from("mensagens_rapidas")
    .select("id, tipo, conteudo, midia_url, ativo")
    .eq("atalho", atalho)
    .maybeSingle();

  if (rapidaError) {
    return NextResponse.json({ error: rapidaError.message }, { status: 500 });
  }
  if (!rapida || !rapida.ativo) {
    return NextResponse.json({ error: "Mensagem rápida não encontrada ou inativa" }, { status: 404 });
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, numero_whatsapp, instancia")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
  }

  const endpoint = ZAPI_ENDPOINT_POR_TIPO[rapida.tipo] ?? ZAPI_ENDPOINT_POR_TIPO.texto;
  const conteudoEnvio = rapida.tipo === "texto" ? rapida.conteudo || "" : rapida.midia_url || "";

  if (!conteudoEnvio) {
    return NextResponse.json({ error: "Mensagem rápida sem conteúdo para enviar" }, { status: 422 });
  }

  const zapi = zapiConfig(lead.instancia as ZapiInstancia);
  if (!zapi) {
    return NextResponse.json({ error: "Z-API não configurada" }, { status: 500 });
  }

  const zapiRes = await fetch(`${zapi.baseUrl}/${endpoint.path}`, {
    method: "POST",
    headers: zapi.headers,
    body: JSON.stringify({
      phone: lead.numero_whatsapp,
      [endpoint.field]: conteudoEnvio,
    }),
  });

  if (!zapiRes.ok) {
    const errText = await zapiRes.text().catch(() => "");
    return NextResponse.json(
      { error: `Falha ao enviar via Z-API: ${errText || zapiRes.status}` },
      { status: 502 }
    );
  }

  const { error: saveError } = await supabase.from("mensagens").insert({
    lead_id: leadId,
    conteudo: rapida.tipo === "texto" ? conteudoEnvio : rapida.conteudo || "",
    role: "assistente",
    tipo: rapida.tipo,
    midia_url: rapida.tipo !== "texto" ? rapida.midia_url : null,
    enviado_em: new Date().toISOString(),
    acao_executada: "ENVIAR_RAPIDA",
  });

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tipo: rapida.tipo });
}
