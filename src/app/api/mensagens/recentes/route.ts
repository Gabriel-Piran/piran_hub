import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import type { Mensagem } from "@/types";

interface MensagemRow {
  id: string;
  lead_id: string;
  conteudo: string;
  role: string;
  tipo: string;
  enviado_em: string;
  leads: { nome: string; instancia: string } | { nome: string; instancia: string }[] | null;
}

export async function GET() {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("mensagens")
    .select("id, lead_id, conteudo, role, tipo, enviado_em, leads(nome, instancia)")
    .eq("role", "lead")
    .order("enviado_em", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mensagens: Mensagem[] = ((data ?? []) as unknown as MensagemRow[]).map((row) => {
    const leadInfo = Array.isArray(row.leads) ? row.leads[0] : row.leads;
    return {
      id: row.id,
      lead_id: row.lead_id,
      lead_nome: leadInfo?.nome ?? "Lead",
      conteudo: row.conteudo,
      role: row.role as Mensagem["role"],
      tipo: row.tipo as Mensagem["tipo"],
      enviado_em: row.enviado_em,
      instancia: (leadInfo?.instancia ?? "ads") as Mensagem["instancia"],
    };
  });

  return NextResponse.json(mensagens);
}
