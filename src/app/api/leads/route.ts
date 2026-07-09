import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

const LEAD_COLUMNS =
  "id, nome, nome_whatsapp, numero_whatsapp, instancia, estagio, status, modo_atendimento, departamento_id, salario, cpf, data_nascimento, nome_mae, logradouro, numero_end, bairro, cidade, estado, cep, criado_em, atualizado_em";

const RESTRICTED_PERFIS = ["secretaria", "estagio"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "ativo";
  const instancia = searchParams.get("instancia");
  const estagio = searchParams.get("estagio");
  const departamentoId = searchParams.get("departamento_id");
  const perfil = request.headers.get("x-user-perfil");
  const userId = request.headers.get("x-user-id");

  const supabase = supabaseAdmin();
  let query = supabase.from("leads").select(LEAD_COLUMNS);

  if (status !== "todos") {
    query = query.eq("status", status);
  }
  if (instancia) query = query.eq("instancia", instancia);
  if (estagio) query = query.eq("estagio", estagio);
  if (departamentoId) query = query.eq("departamento_id", departamentoId);

  if (perfil && RESTRICTED_PERFIS.includes(perfil) && userId) {
    const { data: vinculos } = await supabase
      .from("usuarios_departamentos")
      .select("departamento_id")
      .eq("usuario_id", userId);

    const departamentoIds = (vinculos ?? []).map((v) => v.departamento_id);
    if (departamentoIds.length === 0) {
      return NextResponse.json([]);
    }
    query = query.in("departamento_id", departamentoIds);
  }

  const { data, error } = await query.order("atualizado_em", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
