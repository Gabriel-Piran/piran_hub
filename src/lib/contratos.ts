export interface GerarContratoResultado {
  ok: boolean;
  status: number;
  error?: string;
  resultado?: unknown;
}

export async function gerarContrato(leadId: string): Promise<GerarContratoResultado> {
  const webhookUrl = process.env.N8N_GERAR_CONTRATO_URL;
  if (!webhookUrl) {
    return { ok: false, status: 500, error: "Webhook do n8n não configurado" };
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
    return { ok: false, status: 502, error: "Falha ao gerar contrato", resultado: payload };
  }

  return { ok: true, status: 200, resultado: payload };
}
