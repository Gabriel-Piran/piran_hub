import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

const LEAD_COLUMNS =
  "id, nome, nome_whatsapp, numero_whatsapp, instancia, estagio, status, salario, cpf, data_nascimento, nome_mae, logradouro, numero_end, bairro, cidade, estado, cep, criado_em, atualizado_em";

export async function GET() {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .in("status", ["contrato_enviado", "contrato_assinado"])
    .order("atualizado_em", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
