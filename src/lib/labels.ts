import type { LeadEstagio } from "@/types";

export const ESTAGIO_LABELS: Record<LeadEstagio, string> = {
  RECEPCAO: "Recepção",
  TRIAGEM_DOMESTICO: "Triagem doméstico",
  QUALIFICACAO_SALARIO: "Qualif. salário",
  QUALIFICACAO_TEMPO: "Qualif. tempo",
  QUALIFICACAO_SAIDA: "Qualif. saída",
  QUALIFICACAO_DATA: "Qualif. data",
  PROPOSTA: "Proposta",
  COLETA_RG: "Coleta RG",
  COLETA_ENDERECO: "Coleta endereço",
  CONTRATO: "Contrato enviado",
  AGUARDANDO: "Aguardando assinatura",
};
