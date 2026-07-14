import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { agendarFollowupsParaRegra } from "@/lib/followup-scheduler";

/**
 * Verifica todas as regras de follow-up ativas e agenda follow-ups para os
 * leads elegíveis de cada uma. Chamar periodicamente (ex.: cron do n8n) em
 * vez de disparar POST /api/followup/agendar manualmente regra por regra.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const clientSecret =
      request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret");
    if (clientSecret !== cronSecret) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  const supabase = supabaseAdmin();
  const { data: regras, error } = await supabase
    .from("followup_regras")
    .select("id, nome")
    .eq("ativo", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const resultados = [];
  for (const regra of regras ?? []) {
    try {
      const agendados = await agendarFollowupsParaRegra(regra.id);
      resultados.push({ regra_id: regra.id, nome: regra.nome, agendados });
    } catch (err) {
      resultados.push({
        regra_id: regra.id,
        nome: regra.nome,
        erro: (err as Error).message,
      });
    }
  }

  return NextResponse.json({
    regras_verificadas: resultados.length,
    total_agendados: resultados.reduce((acc, r) => acc + (r.agendados ?? 0), 0),
    resultados,
  });
}
