export type LeadEstagio = string;

export const LEAD_ESTAGIOS: LeadEstagio[] = [
  "RECEPCAO",
  "COM_CTPS",
  "TRIAGEM_DOMESTICO",
  "TRIAGEM_DIAS_DOMESTICO",
  "QUALIFICACAO_SALARIO",
  "QUALIFICACAO_TEMPO",
  "QUALIFICACAO_SAIDA",
  "QUALIFICACAO_DATA",
  "PROPOSTA",
  "COLETA_RG",
  "COLETA_ENDERECO",
  "CONTRATO",
  "AGENDAMENTO",
  "AGUARDANDO",
];

export type Instancia = "ads" | "indicacoes";

export type LeadStatus =
  | "ativo"
  | "desqualificado"
  | "transferido"
  | "contrato_enviado"
  | "contrato_assinado"
  | "arquivado";

export type ModoAtendimento = "ia" | "humano" | "pendente";

export const MODO_ATENDIMENTO_LABELS: Record<ModoAtendimento, string> = {
  ia: "IA",
  humano: "Atendendo",
  pendente: "Pendente",
};

export interface Lead {
  id: string;
  nome: string;
  nome_whatsapp?: string | null;
  foto_perfil_url?: string | null;
  numero_whatsapp: string;
  instancia: Instancia;
  estagio: LeadEstagio;
  status: LeadStatus;
  modo_atendimento: ModoAtendimento;
  departamento_id?: string | null;
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
export type MensagemAcaoExecutada = "enviado" | "cancelado" | "ignorado" | null;

export interface Mensagem {
  id: string;
  lead_id: string;
  lead_nome: string;
  conteudo: string;
  role: MensagemRole;
  tipo: MensagemTipo;
  enviado_em: string;
  instancia: Instancia;
  agendado_para?: string | null;
  nota_interna?: boolean;
  acao_executada?: MensagemAcaoExecutada;
  departamento_id?: string | null;
  midia_url?: string | null;
  enviado_por_atendente?: boolean;
  origem?: "manual" | "followup" | "followup_previsto";
  followup_regra_nome?: string | null;
}

export interface Departamento {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  ativo: boolean;
  criado_em: string;
}

export type MensagemRapidaTipo = "texto" | "audio" | "video" | "imagem";

export interface MensagemRapida {
  id: string;
  titulo: string;
  tipo: MensagemRapidaTipo;
  conteudo: string | null;
  midia_url: string | null;
  atalho: string | null;
  departamento_id: string | null;
  ativo: boolean;
  criado_por: string | null;
  criado_em: string;
}

export interface EstagioCustomizado {
  id: string;
  nome: string;
  slug: string;
  cor: string;
  icone: string | null;
  ordem: number;
  ativo: boolean;
  criado_em: string;
}

export interface FollowupRegra {
  id: string;
  nome: string;
  estagio_gatilho: string;
  dias_espera: number;
  hora_envio: string;
  mensagem_rapida_id: string | null;
  mensagem_texto: string | null;
  ativo: boolean;
  criado_em: string;
  horario_inicio?: string;
  horario_fim?: string;
  intervalo_minutos_min?: number;
  intervalo_minutos_max?: number;
  dias_semana?: string[];
}

export interface LeadComMensagens extends Lead {
  mensagens: Mensagem[];
  mensagens_agendadas_followup?: Mensagem[];
}

export type AcaoTipo =
  | "estagio"
  | "status"
  | "mensagem"
  | "webhook"
  | "transferir"
  | "arquivar"
  | "contrato";

export const ACAO_TIPO_LABELS: Record<AcaoTipo, string> = {
  estagio: "Mudar estágio",
  status: "Mudar status",
  mensagem: "Enviar mensagem",
  webhook: "Webhook",
  transferir: "Transferir para humano",
  arquivar: "Arquivar",
  contrato: "Gerar contrato",
};

export interface Acao {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  tipo: AcaoTipo;
  configuracao: Record<string, unknown>;
  ativo: boolean;
  criado_em: string;
}

export interface RegraCondicional {
  id: string;
  nome: string;
  estagio_gatilho: string | null;
  palavras_chave: string[];
  acao_id: string | null;
  prioridade: number;
  ativo: boolean;
  criado_em: string;
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
  departamento_ids?: string[];
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

export interface PromptAlineHistorico {
  id: string;
  titulo: string;
  descricao: string | null;
  conteudo: string;
  ativo: boolean;
  editado_por: string | null;
  criado_em: string;
}

export interface BaseConhecimentoItem {
  id: string;
  categoria: string;
  titulo: string;
  quando_usar: string;
  exemplos_frases: string[];
  resposta_modelo: string;
  ordem: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}
