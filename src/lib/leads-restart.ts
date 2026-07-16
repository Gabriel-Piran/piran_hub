import type { SupabaseClient } from "@supabase/supabase-js";

import { LEAD_ESTAGIOS } from "@/types";

export interface RestartLeadResultado {
  ok: boolean;
  status: number;
  error?: string;
  lead?: { id: string; nome: string; estagio: string; modo_atendimento: string };
}

export async function restartLeadAtendimento(
  supabase: SupabaseClient,
  leadId: string
): Promise<RestartLeadResultado> {
  const { data: primeiroEstagio } = await supabase
    .from("estagios_customizados")
    .select("slug")
    .order("ordem", { ascending: true })
    .limit(1)
    .maybeSingle();

  const estagioInicial = primeiroEstagio?.slug ?? LEAD_ESTAGIOS[0];

  const { error: deleteError } = await supabase
    .from("mensagens")
    .delete()
    .eq("lead_id", leadId);

  if (deleteError) {
    return { ok: false, status: 500, error: deleteError.message };
  }

  const { data, error } = await supabase
    .from("leads")
    .update({
      estagio: estagioInicial,
      modo_atendimento: "ia",
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", leadId)
    .select("id, nome, estagio, modo_atendimento")
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }

  if (!data) {
    return { ok: false, status: 404, error: "Lead não encontrado" };
  }

  return { ok: true, status: 200, lead: data };
}
