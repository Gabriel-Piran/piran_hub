import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { zapiConfig, type ZapiInstancia } from "@/lib/zapi";

const INSTANCIAS: ZapiInstancia[] = ["ads", "indicacoes"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const numeroBruto = typeof body?.numero_whatsapp === "string" ? body.numero_whatsapp : "";
  const numeroWhatsapp = numeroBruto.replace(/\D/g, "");
  const instancia = body?.instancia as ZapiInstancia;
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  const mensagemInicial =
    typeof body?.mensagem_inicial === "string" ? body.mensagem_inicial.trim() : "";

  if (!numeroWhatsapp || !INSTANCIAS.includes(instancia) || !mensagemInicial) {
    return NextResponse.json(
      { error: "numero_whatsapp, instancia e mensagem_inicial são obrigatórios" },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();

  const { data: leadExistente, error: buscaError } = await supabase
    .from("leads")
    .select("id")
    .eq("numero_whatsapp", numeroWhatsapp)
    .maybeSingle();

  if (buscaError) {
    return NextResponse.json({ error: buscaError.message }, { status: 500 });
  }

  let leadId = leadExistente?.id as string | undefined;
  let criado = false;

  if (!leadId) {
    const { data: novoLead, error: insertError } = await supabase
      .from("leads")
      .insert({
        numero_whatsapp: numeroWhatsapp,
        instancia,
        nome: nome || null,
        estagio: "RECEPCAO",
        status: "ativo",
        modo_atendimento: "humano",
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    leadId = novoLead.id;
    criado = true;
  }

  const zapi = zapiConfig(instancia);
  if (!zapi) {
    return NextResponse.json({ error: "Z-API não configurada" }, { status: 500 });
  }

  const zapiRes = await fetch(`${zapi.baseUrl}/send-text`, {
    method: "POST",
    headers: zapi.headers,
    body: JSON.stringify({
      phone: numeroWhatsapp,
      message: mensagemInicial,
    }),
  });

  if (!zapiRes.ok) {
    const errText = await zapiRes.text().catch(() => "");
    return NextResponse.json(
      { error: `Falha ao enviar via Z-API: ${errText || zapiRes.status}` },
      { status: 502 }
    );
  }

  const { error: mensagemError } = await supabase.from("mensagens").insert({
    lead_id: leadId,
    conteudo: mensagemInicial,
    role: "sistema",
    tipo: "texto",
    enviado_em: new Date().toISOString(),
    enviado_por_atendente: true,
  });

  if (mensagemError) {
    return NextResponse.json({ error: mensagemError.message }, { status: 500 });
  }

  return NextResponse.json({ lead_id: leadId, criado });
}
