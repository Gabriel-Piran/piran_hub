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
  leads:
    | { nome: string; instancia: string; departamento_id: string | null }
    | { nome: string; instancia: string; departamento_id: string | null }[]
    | null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const departamentoId = searchParams.get("departamento_id");
  const perfil = request.headers.get("x-user-perfil");
  const userId = request.headers.get("x-user-id");

  const supabase = supabaseAdmin();

  let query = supabase
    .from("mensagens")
    .select(
      "id, lead_id, conteudo, role, tipo, enviado_em, leads!inner(nome, instancia, departamento_id)"
    )
    .eq("role", "lead");

  if (departamentoId) {
    query = query.eq("leads.departamento_id", departamentoId);
  }

  if (perfil && ["secretaria", "estagio"].includes(perfil) && userId) {
    const { data: vinculos } = await supabase
      .from("usuarios_departamentos")
      .select("departamento_id")
      .eq("usuario_id", userId);

    const departamentoIds = (vinculos ?? []).map((v) => v.departamento_id);
    if (departamentoIds.length === 0) {
      return NextResponse.json([]);
    }
    query = query.in("leads.departamento_id", departamentoIds);
  }

  const { data, error } = await query.order("enviado_em", { ascending: false }).limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mensagens: Mensagem[] = ((data ?? []) as unknown as MensagemRow[])
    .filter((row) => (Array.isArray(row.leads) ? row.leads.length > 0 : row.leads !== null))
    .map((row) => {
      const leadInfo = Array.isArray(row.leads) ? row.leads[0] : row.leads;
      return {
        id: row.id,
        lead_id: row.lead_id,
        lead_nome: leadInfo?.nome || "Lead",
        conteudo: row.conteudo || "",
        role: row.role as Mensagem["role"],
        tipo: row.tipo as Mensagem["tipo"],
        enviado_em: row.enviado_em,
        instancia: (leadInfo?.instancia || "ads") as Mensagem["instancia"],
        departamento_id: leadInfo?.departamento_id ?? null,
      };
    });

  return NextResponse.json(mensagens);
}
