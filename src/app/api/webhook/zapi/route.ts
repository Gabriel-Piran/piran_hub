import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { deletarLeadCompleto } from "@/lib/leads-restart";

const N8N_WEBHOOK_URL = "https://n8n-production-d971c.up.railway.app/webhook/evolution-webhook";

async function atualizarModoAtendimento(phone: string, modo: "humano" | "ia") {
  const supabase = supabaseAdmin();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id")
    .eq("numero_whatsapp", phone)
    .maybeSingle();

  if (leadError || !lead) return false;

  const { error } = await supabase
    .from("leads")
    .update({ modo_atendimento: modo, atualizado_em: new Date().toISOString() })
    .eq("id", lead.id);

  return !error;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  if (body.fromMe === true) {
    return NextResponse.json({ ok: true });
  }

  const texto = (body.text?.message ?? "").trim().toLowerCase();
  const phone = body.phone;

  if (texto === "/restart") {
    let executado = false;
    if (phone) {
      const supabase = supabaseAdmin();
      const { data: lead } = await supabase
        .from("leads")
        .select("id")
        .eq("numero_whatsapp", phone)
        .maybeSingle();

      if (lead) {
        const resultado = await deletarLeadCompleto(supabase, lead.id);
        executado = resultado.ok;
      }
    }
    return NextResponse.json({ comando: "restart", executado });
  }

  if (texto === "/parar") {
    const executado = phone ? await atualizarModoAtendimento(phone, "humano") : false;
    return NextResponse.json({ comando: "parar", executado });
  }

  if (texto === "/ia") {
    const executado = phone ? await atualizarModoAtendimento(phone, "ia") : false;
    return NextResponse.json({ comando: "ia", executado });
  }

  const n8nRes = await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const n8nBody = await n8nRes.text();
  return new NextResponse(n8nBody, {
    status: n8nRes.status,
    headers: { "Content-Type": n8nRes.headers.get("Content-Type") ?? "application/json" },
  });
}
