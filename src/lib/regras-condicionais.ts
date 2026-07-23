import type { SupabaseClient } from "@supabase/supabase-js";

export interface AcaoCorrespondente {
  id: string;
  slug: string;
  tipo: string;
  configuracao: Record<string, unknown> | null;
}

export async function encontrarAcaoPorRegra(
  supabase: SupabaseClient,
  mensagem: string,
  estagio: string
): Promise<AcaoCorrespondente | null> {
  const mensagemLower = mensagem.toLowerCase();
  if (!mensagemLower) return null;

  const { data: regras, error } = await supabase
    .from("regras_condicionais")
    .select("id, estagio_gatilho, palavras_chave, acao_id, prioridade, ativo")
    .eq("ativo", true)
    .order("prioridade", { ascending: false });

  if (error || !regras) return null;

  const regraCorrespondente = regras.find((regra) => {
    if (regra.estagio_gatilho && regra.estagio_gatilho !== estagio) return false;
    const palavras = Array.isArray(regra.palavras_chave) ? regra.palavras_chave : [];
    return palavras.some((palavra: string) => mensagemLower.includes(String(palavra).toLowerCase()));
  });

  if (!regraCorrespondente || !regraCorrespondente.acao_id) return null;

  const { data: acao } = await supabase
    .from("acoes")
    .select("id, slug, tipo, configuracao")
    .eq("id", regraCorrespondente.acao_id)
    .eq("ativo", true)
    .maybeSingle();

  return acao ?? null;
}
