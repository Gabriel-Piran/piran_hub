import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { zapiConfig } from "@/lib/zapi";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const leadId = typeof body?.lead_id === "string" ? body.lead_id : "";
  const mensagem = typeof body?.mensagem === "string" ? body.mensagem.trim() : "";

  if (!leadId || !mensagem) {
    return NextResponse.json(
      { error: "lead_id e mensagem são obrigatórios" },
      { status: 400 }
    );
  }

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

  const zapiRes = await fetch(`${zapi.baseUrl}/send-text`, {
    method: "POST",
    headers: zapi.headers,
    body: JSON.stringify({
      phone: lead.numero_whatsapp,
      message: mensagem,
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
      tipo: "texto",
      enviado_em: new Date().toISOString(),
    })
    .select("id, lead_id, conteudo, role, tipo, enviado_em")
    .single();

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mensagem: saved });
}
