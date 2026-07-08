"use client";

import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { useLead, useRecentMessages } from "@/hooks/useDashboard";
import type { Mensagem } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function ChatBubble({ mensagem }: { mensagem: Mensagem }) {
  if (mensagem.role === "sistema") {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/40">
          {mensagem.conteudo}
        </span>
      </div>
    );
  }

  const isAssistente = mensagem.role === "assistente";

  return (
    <div className={cn("flex", isAssistente ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-md rounded-lg px-4 py-3 text-sm",
          isAssistente
            ? "rounded-tr-none bg-[#c9a84c]/20 text-white"
            : "rounded-tl-none bg-white/5 text-white"
        )}
      >
        {mensagem.conteudo}
        <p className="mt-1 text-[10px] text-white/30">
          {formatDistanceToNow(new Date(mensagem.enviado_em), {
            addSuffix: true,
            locale: ptBR,
          })}
        </p>
      </div>
    </div>
  );
}

function ConversationsView() {
  const { messages, isLoading } = useRecentMessages();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeLeadId = selectedLeadId ?? messages[0]?.lead_id ?? null;

  const { lead, isLoading: isLoadingLead, mutate } = useLead(activeLeadId);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lead?.mensagens.length]);

  const handleSend = async () => {
    const conteudo = draft.trim();
    if (!conteudo || !activeLeadId) return;

    setSending(true);
    try {
      const res = await fetch("/api/mensagens/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: activeLeadId, mensagem: conteudo }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error ?? "Erro ao enviar mensagem.");
        return;
      }

      setDraft("");
      await mutate();
    } catch {
      toast.error("Erro de conexão ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white/80">Conversas</h2>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto">
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}

          {!isLoading &&
            messages.map((message) => {
              const isSelected = activeLeadId === message.lead_id;
              return (
                <button
                  key={message.id}
                  onClick={() => setSelectedLeadId(message.lead_id)}
                  className={cn(
                    "flex items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors last:border-0 hover:bg-white/5",
                    isSelected && "bg-[#c9a84c]/10"
                  )}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback>{initials(message.lead_nome)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-white">
                        {message.lead_nome}
                      </p>
                      <Badge
                        variant={message.instancia === "ads" ? "ads" : "indicacoes"}
                      >
                        {message.instancia}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-white/50">
                      {message.conteudo}
                    </p>
                  </div>
                </button>
              );
            })}

          {!isLoading && messages.length === 0 && (
            <p className="p-4 text-sm text-white/40">
              Nenhuma conversa encontrada.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
        {isLoadingLead && (
          <div className="flex flex-col gap-3 p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-24 w-2/3" />
          </div>
        )}

        {!isLoadingLead && lead && (
          <>
            <div className="flex items-center gap-3 border-b border-white/10 px-6 py-4">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback>{initials(lead.nome)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <p className="text-sm font-semibold text-white">{lead.nome}</p>
                <p className="text-xs text-white/40">{lead.numero_whatsapp}</p>
              </div>
              <Badge
                variant={lead.instancia === "ads" ? "ads" : "indicacoes"}
                className="ml-auto"
              >
                {lead.instancia}
              </Badge>
            </div>

            <div
              ref={scrollRef}
              className="flex flex-1 flex-col gap-3 overflow-y-auto p-6"
            >
              {lead.mensagens.length === 0 && (
                <p className="text-center text-sm text-white/40">
                  Nenhuma mensagem ainda.
                </p>
              )}
              {lead.mensagens.map((mensagem) => (
                <ChatBubble key={mensagem.id} mensagem={mensagem} />
              ))}
            </div>

            <div className="flex items-center gap-2 border-t border-white/10 px-6 py-4">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Escreva uma mensagem..."
                className="flex-1 rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
              />
              <button
                onClick={handleSend}
                disabled={sending || !draft.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#c9a84c] text-[#0f0f0f] transition-colors hover:bg-[#d9bb63] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Enviar"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </>
        )}

        {!isLoadingLead && !lead && (
          <div className="flex flex-1 items-center justify-center text-sm text-white/40">
            Nenhuma conversa encontrada.
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConversasPage() {
  return (
    <div className="p-6">
      <ErrorBoundary label="as conversas">
        <ConversationsView />
      </ErrorBoundary>
    </div>
  );
}
