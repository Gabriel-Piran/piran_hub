import useSWR from "swr";

import { apiFetch } from "@/lib/api";
import type { Perfil } from "@/types";

export interface SessionUser {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  ultimoAcesso: string | null;
}

export function useSession() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/auth/me",
    (endpoint) => apiFetch<SessionUser>(endpoint),
    { onError: (err) => console.error("SWR error:", err) }
  );

  return {
    user: data ?? null,
    isLoading,
    isError: !!error,
    mutate,
  };
}
