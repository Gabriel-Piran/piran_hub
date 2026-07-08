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
  Lead,
  LeadComMensagens,
  LeadEstagio,
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

export function useRecentMessages() {
  const { data, error, isLoading } = useSWR(
    "/api/mensagens/recentes",
    (endpoint: string) =>
      fetchWithFallback<Mensagem[]>(endpoint, mockMensagens),
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
