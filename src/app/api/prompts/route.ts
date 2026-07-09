import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { LEAD_ESTAGIOS } from "@/types";

const PROMPT_COLUMNS = "id, estagio, titulo, descricao, conteudo, ativo, atualizado_em";

export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from("prompts_aline").select(PROMPT_COLUMNS);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ordenado = [...(data ?? [])].sort(
    (a, b) => LEAD_ESTAGIOS.indexOf(a.estagio) - LEAD_ESTAGIOS.indexOf(b.estagio)
  );

  return NextResponse.json(ordenado);
}
