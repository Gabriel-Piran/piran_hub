import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import type { MensagemRole, MensagemTipo } from "@/types";

const COLUMNS =
  "id, lead_id, conteudo, role, tipo, enviado_em, agendado_para, nota_interna, acao_executada";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const leadId = typeof body?.lead_id === "string" ? body.lead_id : "";
  const conteudo = typeof body?.conteudo === "string" ? body.conteudo.trim() : "";
  const notaInterna = Boolean(body?.nota_interna);
  const role: MensagemRole = notaInterna ? "sistema" : (body?.role ?? "sistema");
  const tipo: MensagemTipo = (body?.tipo as MensagemTipo) ?? "texto";
  const agendadoPara = typeof body?.agendado_para === "string" ? body.agendado_para : null;

  if (!leadId || !conteudo) {
    return NextResponse.json(
      { error: "lead_id e conteudo são obrigatórios" },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("mensagens")
    .insert({
      lead_id: leadId,
      conteudo,
      role,
      tipo,
      enviado_em: new Date().toISOString(),
      agendado_para: agendadoPara,
      nota_interna: notaInterna,
    })
    .select(COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mensagem: data }, { status: 201 });
}
