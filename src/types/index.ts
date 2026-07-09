export type LeadEstagio =
  | "RECEPCAO"
  | "TRIAGEM_DOMESTICO"
  | "QUALIFICACAO_SALARIO"
  | "QUALIFICACAO_TEMPO"
  | "QUALIFICACAO_SAIDA"
  | "QUALIFICACAO_DATA"
  | "PROPOSTA"
  | "COLETA_RG"
  | "COLETA_ENDERECO"
  | "CONTRATO"
  | "AGUARDANDO";

export const LEAD_ESTAGIOS: LeadEstagio[] = [
  "RECEPCAO",
  "TRIAGEM_DOMESTICO",
  "QUALIFICACAO_SALARIO",
  "QUALIFICACAO_TEMPO",
  "QUALIFICACAO_SAIDA",
  "QUALIFICACAO_DATA",
  "PROPOSTA",
  "COLETA_RG",
  "COLETA_ENDERECO",
  "CONTRATO",
  "AGUARDANDO",
];

export type Instancia = "ads" | "indicacoes";

export type LeadStatus =
  | "ativo"
  | "desqualificado"
  | "contrato_enviado"
  | "contrato_assinado";

export interface Lead {
  id: string;
  nome: string;
  nome_whatsapp?: string | null;
  numero_whatsapp: string;
  instancia: Instancia;
  estagio: LeadEstagio;
  status: LeadStatus;
  salario?: number | null;
  cpf?: string | null;
  data_nascimento?: string | null;
  nome_mae?: string | null;
  logradouro?: string | null;
  numero_end?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  criado_em: string;
  atualizado_em: string;
}

export type MensagemRole = "lead" | "assistente" | "sistema";
export type MensagemTipo = "texto" | "audio" | "imagem" | "documento";

export interface Mensagem {
  id: string;
  lead_id: string;
  lead_nome: string;
  conteudo: string;
  role: MensagemRole;
  tipo: MensagemTipo;
  enviado_em: string;
  instancia: Instancia;
}

export interface LeadComMensagens extends Lead {
  mensagens: Mensagem[];
}

export interface MetricasCard {
  id: string;
  titulo: string;
  valor: string;
  variacao?: number;
}

export interface ChartPoint {
  data: string;
  recebidos: number;
  qualificados: number;
  contratos: number;
}

export type Perfil = "admin" | "advogado" | "secretaria" | "estagio";

export const PERFIL_LABELS: Record<Perfil, string> = {
  admin: "Administrador",
  advogado: "Advogado",
  secretaria: "Secretária",
  estagio: "Estagiário",
};

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  criado_em: string;
  ultimo_acesso: string | null;
}

export interface PromptAline {
  id: string;
  estagio: LeadEstagio;
  titulo: string;
  descricao: string | null;
  conteudo: string;
  ativo: boolean;
  atualizado_em: string;
}
