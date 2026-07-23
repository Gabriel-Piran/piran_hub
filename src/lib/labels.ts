import type { LeadEstagio } from "@/types";

export const ESTAGIO_LABELS: Record<LeadEstagio, string> = {
  RECEPCAO: "Recepção",
  COM_CTPS: "Com carteira assinada",
  TRIAGEM_DOMESTICO: "Triagem doméstico",
  TRIAGEM_DIAS_DOMESTICO: "Dias/semana doméstico",
  QUALIFICACAO_SALARIO: "Qualif. salário",
  QUALIFICACAO_TEMPO: "Qualif. tempo",
  QUALIFICACAO_SAIDA: "Qualif. saída",
  QUALIFICACAO_DATA: "Qualif. data",
  PROPOSTA: "Proposta",
  COLETA_RG: "Coleta RG",
  COLETA_ENDERECO: "Coleta endereço",
  CONTRATO: "Contrato enviado",
  AGUARDANDO: "Aguardando assinatura",
  FUP_TRABALHANDO: "Follow-up (ainda empregado)",
  DESQUALIFICAR: "Encerramento (desqualificado)",
  TRANSFERIR_HUMANO: "Encerramento (transferência)",
};
