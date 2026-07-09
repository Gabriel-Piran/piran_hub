import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const supabase = supabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("mensagens")
    .select("id, lead_id, conteudo, tipo, agendado_para, leads(numero_whatsapp, instancia)")
    .lte("agendado_para", now)
    .is("acao_executada", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pendentes = data ?? [];
  if (pendentes.length === 0) {
    return NextResponse.json([]);
  }

  await supabase
    .from("mensagens")
    .update({ acao_executada: "enviado", enviado_em_real: now })
    .in(
      "id",
      pendentes.map((m) => m.id)
    );

  const itens = pendentes.map((m) => {
    const lead = Array.isArray(m.leads) ? m.leads[0] : m.leads;
    return {
      mensagem_id: m.id,
      lead_id: m.lead_id,
      numero_whatsapp: lead?.numero_whatsapp ?? "",
      instancia: lead?.instancia ?? "",
      conteudo: m.conteudo,
      tipo: m.tipo,
    };
  });

  return NextResponse.json(itens);
}
