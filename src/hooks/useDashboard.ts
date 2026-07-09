import useSWR from "swr";

import { apiFetch, fetchWithFallback } from "@/lib/api";
import {
  buildMockChart,
  mockLeads,
  mockMensagens,
  mockMetrics,
} from "@/lib/mock-data";
import { LEAD_ESTAGIOS } from "@/types";
import type {
  ChartPoint,
  Departamento,
  EstagioCustomizado,
  Lead,
  LeadComMensagens,
  LeadEstagio,
  MensagemRapida,
  MetricasCard,
  Mensagem,
} from "@/types";

const REFRESH_INTERVAL = 30_000;

export function useMetrics() {
  const { data, error, isLoading } = useSWR(
    "/api/dashboard/metrics",
    (endpoint: string) =>
      fetchWithFallback<MetricasCard[]>(endpoint, mockMetrics),
    { refreshInterval: REFRESH_INTERVAL }
  );

  return {
    metrics: data?.data ?? mockMetrics,
    isLoading,
    isError: !!error || (data?.isMock ?? false),
  };
}

export function useLeads() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/leads?status=ativo",
    (endpoint: string) => fetchWithFallback<Lead[]>(endpoint, mockLeads),
    { refreshInterval: REFRESH_INTERVAL }
  );

  const leads = data?.data ?? mockLeads;

  const columns = LEAD_ESTAGIOS.reduce<Record<LeadEstagio, Lead[]>>(
    (acc, estagio) => {
      acc[estagio] = leads.filter((lead) => lead.estagio === estagio);
      return acc;
    },
    {} as Record<LeadEstagio, Lead[]>
  );

  const setLeadEstagio = (leadId: string, estagio: LeadEstagio) => {
    mutate(
      (current) =>
        current && {
          ...current,
          data: current.data.map((lead) =>
            lead.id === leadId ? { ...lead, estagio } : lead
          ),
        },
      { revalidate: false }
    );
  };

  return {
    leads,
    columns,
    isLoading,
    isError: !!error || (data?.isMock ?? false),
    setLeadEstagio,
    revalidateLeads: () => mutate(),
  };
}

export function useRecentMessages(departamentoId?: string | null) {
  const endpoint = departamentoId
    ? `/api/mensagens/recentes?departamento_id=${departamentoId}`
    : "/api/mensagens/recentes";

  const { data, error, isLoading } = useSWR(
    endpoint,
    (url: string) => fetchWithFallback<Mensagem[]>(url, mockMensagens),
    { refreshInterval: REFRESH_INTERVAL }
  );

  return {
    messages: data?.data ?? mockMensagens,
    isLoading,
    isError: !!error || (data?.isMock ?? false),
  };
}

export function useLead(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/leads/${id}` : null,
    (endpoint: string) => apiFetch<LeadComMensagens>(endpoint),
    { refreshInterval: 5_000 }
  );

  return {
    lead: data ?? null,
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useDepartamentos() {
  const { data, isLoading, mutate } = useSWR("/api/departamentos", (endpoint: string) =>
    apiFetch<Departamento[]>(endpoint)
  );

  return { departamentos: data ?? [], isLoading, mutate };
}

export function useEstagios() {
  const { data, isLoading, mutate } = useSWR("/api/estagios", (endpoint: string) =>
    apiFetch<EstagioCustomizado[]>(endpoint)
  );

  return { estagios: data ?? [], isLoading, mutate };
}

export function useMensagensRapidas(departamentoId?: string | null) {
  const endpoint = departamentoId
    ? `/api/mensagens-rapidas?departamento_id=${departamentoId}`
    : "/api/mensagens-rapidas";

  const { data, isLoading, mutate } = useSWR(endpoint, (url: string) =>
    apiFetch<MensagemRapida[]>(url)
  );

  return { mensagensRapidas: data ?? [], isLoading, mutate };
}

export function useLeadsChart(days = 7) {
  const { data, error, isLoading } = useSWR(
    `/api/dashboard/chart?days=${days}`,
    (endpoint: string) =>
      fetchWithFallback<ChartPoint[]>(endpoint, buildMockChart(days)),
    { refreshInterval: REFRESH_INTERVAL }
  );

  return {
    chart: data?.data ?? buildMockChart(days),
    isLoading,
    isError: !!error || (data?.isMock ?? false),
  };
}
