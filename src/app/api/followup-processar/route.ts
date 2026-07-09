import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

interface FollowupItem {
  lead_id: string;
  numero_whatsapp: string;
  instancia: string;
  mensagem: string;
  tipo: string;
}

export async function GET() {
  const supabase = supabaseAdmin();

  const { data: regras, error: regrasError } = await supabase
    .from("followup_regras")
    .select(
      "id, estagio_gatilho, dias_espera, mensagem_texto, mensagem_rapida_id, mensagens_rapidas(conteudo, midia_url, tipo)"
    )
    .eq("ativo", true);

  if (regrasError) {
    return NextResponse.json({ error: regrasError.message }, { status: 500 });
  }

  const itens: FollowupItem[] = [];

  for (const regra of regras ?? []) {
    const limite = new Date();
    limite.setDate(limite.getDate() - regra.dias_espera);

    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id, numero_whatsapp, instancia, estagio, atualizado_em")
      .eq("estagio", regra.estagio_gatilho)
      .lte("atualizado_em", limite.toISOString());

    if (leadsError) continue;

    const rapida = Array.isArray(regra.mensagens_rapidas)
      ? regra.mensagens_rapidas[0]
      : regra.mensagens_rapidas;

    const mensagem = rapida
      ? rapida.tipo === "texto"
        ? (rapida.conteudo ?? "")
        : (rapida.midia_url ?? "")
      : (regra.mensagem_texto ?? "");
    const tipo = rapida?.tipo ?? "texto";

    if (!mensagem) continue;

    for (const lead of leads ?? []) {
      const { data: jaEnviado } = await supabase
        .from("followups_enviados")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("regra_id", regra.id)
        .maybeSingle();

      if (jaEnviado) continue;

      await supabase.from("followups_enviados").insert({
        lead_id: lead.id,
        regra_id: regra.id,
      });

      itens.push({
        lead_id: lead.id,
        numero_whatsapp: lead.numero_whatsapp,
        instancia: lead.instancia,
        mensagem,
        tipo,
      });
    }
  }

  return NextResponse.json(itens);
}
