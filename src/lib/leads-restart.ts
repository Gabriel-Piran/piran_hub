import type { SupabaseClient } from "@supabase/supabase-js";

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
  const { data, error } = await supabase
    .from("leads")
    .update({
      estagio: "RECEPCAO",
      status: "ativo",
      modo_atendimento: "ia",
      nome: null,
      salario: null,
      tempo_trabalho: null,
      data_saida: null,
      cpf: null,
      data_nascimento: null,
      nome_mae: null,
      logradouro: null,
      numero_end: null,
      bairro: null,
      cidade: null,
      estado: null,
      cep: null,
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

  const { error: mensagensError } = await supabase
    .from("mensagens")
    .update({ acao_executada: "ignorado" })
    .eq("lead_id", leadId)
    .is("acao_executada", null);

  if (mensagensError) {
    return { ok: false, status: 500, error: mensagensError.message };
  }

  const { error: filaError } = await supabase
    .from("followup_fila")
    .delete()
    .eq("lead_id", leadId);

  if (filaError) {
    return { ok: false, status: 500, error: filaError.message };
  }

  return { ok: true, status: 200, lead: data };
}
