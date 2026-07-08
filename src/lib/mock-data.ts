import type { ChartPoint, Lead, MetricasCard, Mensagem } from "@/types";
import { LEAD_ESTAGIOS } from "@/types";

const NOMES = [
  "Maria Souza",
  "João Pereira",
  "Ana Lima",
  "Carlos Santos",
  "Beatriz Alves",
  "Pedro Costa",
  "Juliana Rocha",
  "Rafael Nunes",
  "Camila Dias",
  "Lucas Ferreira",
  "Fernanda Melo",
];

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export const mockLeads: Lead[] = LEAD_ESTAGIOS.flatMap((estagio, i) => {
  const count = (i % 3) + 1;
  return Array.from({ length: count }, (_, j) => {
    const idx = (i * 3 + j) % NOMES.length;
    const status =
      estagio === "CONTRATO"
        ? "contrato_enviado"
        : estagio === "AGUARDANDO"
          ? "contrato_enviado"
          : "ativo";
    return {
      id: `${estagio}-${j}`,
      nome: NOMES[idx],
      nome_whatsapp: NOMES[idx],
      numero_whatsapp: `+55 11 9${String(8000 + idx * 37).padStart(5, "0")}-${String(
        1000 + idx * 13
      ).padStart(4, "0")}`,
      instancia: idx % 2 === 0 ? "ads" : ("indicacoes" as const),
      estagio,
      status: status as Lead["status"],
      salario: 1800 + idx * 120,
      cpf: null,
      data_nascimento: null,
      nome_mae: null,
      logradouro: null,
      numero_end: null,
      bairro: null,
      cidade: null,
      estado: null,
      cep: null,
      criado_em: minutesAgo(i * 30 + j * 7 + 10),
      atualizado_em: minutesAgo(i * 12 + j * 5 + 3),
    };
  });
});

export const mockMetrics: MetricasCard[] = [
  { id: "leads-hoje", titulo: "Total Leads Hoje", valor: "37", variacao: 12 },
  { id: "qualificacao", titulo: "Taxa de Qualificação", valor: "64%", variacao: -3 },
  { id: "contratos-enviados", titulo: "Contratos Enviados", valor: "9", variacao: 8 },
  { id: "aguardando", titulo: "Aguardando Assinatura", valor: "5", variacao: 0 },
];

export const mockMensagens: Mensagem[] = NOMES.slice(0, 10).map((nome, i) => ({
  id: `msg-${i}`,
  lead_id: `lead-${i}`,
  lead_nome: nome,
  conteudo:
    [
      "Olá, gostaria de saber mais sobre o processo trabalhista.",
      "Posso enviar os documentos por aqui mesmo?",
      "Qual o prazo médio para receber uma resposta?",
      "Ainda estou juntando o RG e comprovante de endereço.",
      "Obrigado pelo retorno rápido, doutor!",
      "Já assinei o contrato, o que fazer agora?",
      "Fui demitido sem justa causa semana passada.",
      "Trabalhei 3 anos sem carteira assinada.",
      "Podemos remarcar a ligação para amanhã?",
      "Recebi a proposta, vou analisar com calma.",
    ][i % 10],
  role: "lead" as const,
  tipo: "texto" as const,
  enviado_em: minutesAgo(i * 17 + 2),
  instancia: i % 2 === 0 ? "ads" : ("indicacoes" as const),
}));

export function buildMockChart(days: number): ChartPoint[] {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const recebidos = 20 + ((i * 7) % 15);
    const qualificados = Math.round(recebidos * 0.6);
    const contratos = Math.round(qualificados * 0.3);
    return {
      data: date.toISOString().slice(0, 10),
      recebidos,
      qualificados,
      contratos,
    };
  });
}
