import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

const LEAD_COLUMNS =
  "id, nome, nome_whatsapp, numero_whatsapp, instancia, estagio, status, salario, cpf, data_nascimento, nome_mae, logradouro, numero_end, bairro, cidade, estado, cep, criado_em, atualizado_em";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "ativo";
  const instancia = searchParams.get("instancia");
  const estagio = searchParams.get("estagio");

  const supabase = supabaseAdmin();
  let query = supabase.from("leads").select(LEAD_COLUMNS);

  if (status !== "todos") {
    query = query.eq("status", status);
  }
  if (instancia) query = query.eq("instancia", instancia);
  if (estagio) query = query.eq("estagio", estagio);

  const { data, error } = await query.order("atualizado_em", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
