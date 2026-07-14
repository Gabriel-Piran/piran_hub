"use client";

import { useState } from "react";
import useSWR from "swr";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface InstanciaStatus {
  instancia: "ads" | "indicacoes";
  connected: boolean;
  configured: boolean;
}

type StatusResponse = Record<"ads" | "indicacoes", InstanciaStatus>;

function StatusDot({ loading, connected }: { loading: boolean; connected: boolean }) {
  if (loading) {
    return <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-amber-400" />;
  }
  return (
    <span
      className={`h-2.5 w-2.5 shrink-0 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`}
    />
  );
}

export function IntegracaoStatusRow({
  instancia,
  label,
}: {
  instancia: "ads" | "indicacoes";
  label: string;
}) {
  const { data, isLoading, mutate } = useSWR<StatusResponse>(
    "/api/integracoes/status",
    (endpoint: string) => apiFetch<StatusResponse>(endpoint),
    { refreshInterval: 30_000, onError: (err) => console.error("SWR error:", err) }
  );
  const [reconectando, setReconectando] = useState(false);

  const status = data?.[instancia];
  const loading = isLoading || !data;
  const connected = status?.connected ?? false;

  const reconectar = async () => {
    setReconectando(true);
    try {
      const res = await fetch(`/api/integracoes/reconectar/${instancia}`);
      if (!res.ok) throw new Error();
      toast.success("Solicitação de reconexão enviada.");
      await mutate();
    } catch {
      toast.error("Não foi possível reconectar a instância.");
    } finally {
      setReconectando(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <StatusDot loading={loading} connected={connected} />
      <span className="text-xs text-white/60">
        {loading ? "Verificando..." : connected ? "Conectado" : "Desconectado"}
      </span>
      {!loading && !connected && (
        <Button
          variant="ghost"
          size="sm"
          className="border border-white/10 text-xs"
          disabled={reconectando}
          onClick={reconectar}
        >
          <RefreshCw className={`h-3 w-3 ${reconectando ? "animate-spin" : ""}`} />
          Reconectar
        </Button>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}
