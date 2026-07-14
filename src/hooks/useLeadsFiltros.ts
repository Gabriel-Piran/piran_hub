"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export interface LeadsFiltrosState {
  estagio: string[];
  status: string[];
  departamento_id: string[];
  instancia: string[];
  modo_atendimento: string[];
  criado_de: string;
  criado_ate: string;
  contato_de: string;
  contato_ate: string;
  tem_contrato: "" | "sim" | "nao";
  busca: string;
}

export const FILTROS_VAZIOS: LeadsFiltrosState = {
  estagio: [],
  status: [],
  departamento_id: [],
  instancia: [],
  modo_atendimento: [],
  criado_de: "",
  criado_ate: "",
  contato_de: "",
  contato_ate: "",
  tem_contrato: "",
  busca: "",
};

const LIST_KEYS: (keyof LeadsFiltrosState)[] = [
  "estagio",
  "status",
  "departamento_id",
  "instancia",
  "modo_atendimento",
];

const STORAGE_PREFIX = "piran_hub_filtros:";

function parseFromSearchParams(searchParams: URLSearchParams): LeadsFiltrosState {
  const parsed: LeadsFiltrosState = { ...FILTROS_VAZIOS };
  for (const key of LIST_KEYS) {
    const raw = searchParams.get(key);
    if (raw) (parsed[key] as string[]) = raw.split(",").filter(Boolean);
  }
  parsed.criado_de = searchParams.get("criado_de") ?? "";
  parsed.criado_ate = searchParams.get("criado_ate") ?? "";
  parsed.contato_de = searchParams.get("contato_de") ?? "";
  parsed.contato_ate = searchParams.get("contato_ate") ?? "";
  const temContrato = searchParams.get("tem_contrato");
  parsed.tem_contrato = temContrato === "sim" || temContrato === "nao" ? temContrato : "";
  parsed.busca = searchParams.get("busca") ?? "";
  return parsed;
}

export function filtrosToQueryString(filtros: LeadsFiltrosState): string {
  const params = new URLSearchParams();
  for (const key of LIST_KEYS) {
    const values = filtros[key] as string[];
    if (values.length > 0) params.set(key, values.join(","));
  }
  if (filtros.criado_de) params.set("criado_de", filtros.criado_de);
  if (filtros.criado_ate) params.set("criado_ate", filtros.criado_ate);
  if (filtros.contato_de) params.set("contato_de", filtros.contato_de);
  if (filtros.contato_ate) params.set("contato_ate", filtros.contato_ate);
  if (filtros.tem_contrato) params.set("tem_contrato", filtros.tem_contrato);
  if (filtros.busca) params.set("busca", filtros.busca);
  return params.toString();
}

export function countFiltrosAtivos(filtros: LeadsFiltrosState): number {
  let count = 0;
  for (const key of LIST_KEYS) count += (filtros[key] as string[]).length > 0 ? 1 : 0;
  if (filtros.criado_de || filtros.criado_ate) count += 1;
  if (filtros.contato_de || filtros.contato_ate) count += 1;
  if (filtros.tem_contrato) count += 1;
  if (filtros.busca) count += 1;
  return count;
}

/**
 * Sincroniza filtros com a query string da URL e persiste o último valor
 * usado em localStorage (por página, via `storageKey`) para restaurar entre
 * sessões quando a URL não traz nenhum filtro.
 */
export function useLeadsFiltros(storageKey: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storageFullKey = `${STORAGE_PREFIX}${storageKey}`;

  const [filtros, setFiltros] = useState<LeadsFiltrosState>(() => {
    const fromUrl = parseFromSearchParams(searchParams);
    if (countFiltrosAtivos(fromUrl) > 0) return fromUrl;

    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(storageFullKey);
        if (saved) return { ...FILTROS_VAZIOS, ...JSON.parse(saved) };
      } catch {
        // ignora localStorage corrompido
      }
    }
    return fromUrl;
  });

  const aplicarFiltros = useCallback(
    (novo: LeadsFiltrosState) => {
      setFiltros(novo);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageFullKey, JSON.stringify(novo));
      }
      const qs = filtrosToQueryString(novo);
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, storageFullKey]
  );

  const limparFiltros = useCallback(() => {
    aplicarFiltros(FILTROS_VAZIOS);
  }, [aplicarFiltros]);

  useEffect(() => {
    // Mantém a URL sincronizada com o estado inicial restaurado do localStorage.
    const qs = filtrosToQueryString(filtros);
    const current = searchParams.toString();
    if (qs !== current) {
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalAtivos = useMemo(() => countFiltrosAtivos(filtros), [filtros]);
  const queryString = useMemo(() => filtrosToQueryString(filtros), [filtros]);

  return { filtros, aplicarFiltros, limparFiltros, totalAtivos, queryString };
}
