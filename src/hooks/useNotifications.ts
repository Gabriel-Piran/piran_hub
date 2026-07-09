"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import { useLeads, useRecentMessages } from "@/hooks/useDashboard";
import { useSession } from "@/hooks/useSession";
import type { Lead } from "@/types";

interface PerfilConfig {
  notificacoes: {
    novoLead: boolean;
    novaMensagem: boolean;
    contrato: boolean;
  };
}

export type NotificationTipo = "lead" | "mensagem" | "contrato";

export interface NotificationItem {
  id: string;
  tipo: NotificationTipo;
  titulo: string;
  descricao: string;
  href: string;
  data: string;
}

const LAST_SEEN_KEY = "piran_hub_notificacoes_last_seen";

function readLastSeen(): string {
  if (typeof window === "undefined") return new Date().toISOString();
  return localStorage.getItem(LAST_SEEN_KEY) ?? new Date().toISOString();
}

export function useNotifications() {
  const { data: config } = useSWR("/api/configuracoes/perfil", (endpoint: string) =>
    apiFetch<PerfilConfig>(endpoint)
  );
  const { leads } = useLeads();
  const { messages } = useRecentMessages();
  const { user } = useSession();
  const podeVerContratos = user?.perfil === "admin" || user?.perfil === "advogado";
  const { data: contratos } = useSWR(
    podeVerContratos ? "/api/contratos" : null,
    (endpoint: string) => apiFetch<Lead[]>(endpoint),
    { refreshInterval: 30_000 }
  );

  const [lastSeen, setLastSeen] = useState<string>(() => readLastSeen());
  const sessionStartRef = useRef(new Date().toISOString());
  const toastedRef = useRef(new Set<string>());

  const notificacoes = config?.notificacoes ?? {
    novoLead: true,
    novaMensagem: true,
    contrato: true,
  };

  const items: NotificationItem[] = [];

  if (notificacoes.novoLead) {
    for (const lead of leads) {
      items.push({
        id: `lead-${lead.id}`,
        tipo: "lead",
        titulo: "Novo lead",
        descricao: lead.nome,
        href: "/dashboard/leads",
        data: lead.criado_em,
      });
    }
  }

  if (notificacoes.novaMensagem) {
    for (const mensagem of messages) {
      items.push({
        id: `mensagem-${mensagem.id}`,
        tipo: "mensagem",
        titulo: "Nova mensagem",
        descricao: `${mensagem.lead_nome}: ${mensagem.conteudo}`,
        href: "/dashboard/conversas",
        data: mensagem.enviado_em,
      });
    }
  }

  if (notificacoes.contrato) {
    for (const lead of contratos ?? []) {
      if (lead.status !== "contrato_assinado") continue;
      items.push({
        id: `contrato-${lead.id}`,
        tipo: "contrato",
        titulo: "Contrato assinado",
        descricao: lead.nome,
        href: "/dashboard/contratos",
        data: lead.atualizado_em,
      });
    }
  }

  items.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const signature = items.map((item) => item.id).join(",");

  useEffect(() => {
    const sessionStart = new Date(sessionStartRef.current).getTime();

    for (const item of items) {
      if (toastedRef.current.has(item.id)) continue;
      toastedRef.current.add(item.id);

      if (new Date(item.data).getTime() <= sessionStart) continue;

      toast.message(item.titulo, { description: item.descricao });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const unseenCount = items.filter(
    (item) => new Date(item.data).getTime() > new Date(lastSeen).getTime()
  ).length;

  const markAllSeen = () => {
    const now = new Date().toISOString();
    setLastSeen(now);
    if (typeof window !== "undefined") {
      localStorage.setItem(LAST_SEEN_KEY, now);
    }
  };

  return {
    notifications: items.slice(0, 20),
    unseenCount,
    markAllSeen,
  };
}
