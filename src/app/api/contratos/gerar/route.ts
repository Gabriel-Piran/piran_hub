import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const leadId = typeof body?.lead_id === "string" ? body.lead_id : "";

  if (!leadId) {
    return NextResponse.json({ error: "lead_id é obrigatório" }, { status: 400 });
  }

  const webhookUrl = process.env.N8N_GERAR_CONTRATO_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "Webhook do n8n não configurado" },
      { status: 500 }
    );
  }

  const n8nRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lead_id: leadId }),
  });

  const text = await n8nRes.text().catch(() => "");
  let payload: unknown = text;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    // resposta não é JSON, mantém texto puro
  }

  if (!n8nRes.ok) {
    return NextResponse.json(
      { error: "Falha ao gerar contrato", detalhe: payload },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, resultado: payload });
}
