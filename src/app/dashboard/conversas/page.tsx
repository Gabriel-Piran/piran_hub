"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, Clock, Send, StickyNote, User, X } from "lucide-react";
import { toast } from "sonner";

import {
  useDepartamentos,
  useLead,
  useMensagensRapidas,
  useRecentMessages,
} from "@/hooks/useDashboard";
import { useSession } from "@/hooks/useSession";
import type { Mensagem, MensagemRapida, ModoAtendimento } from "@/types";
import { MODO_ATENDIMENTO_LABELS } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { cn } from "@/lib/utils";

function initials(name: string | null | undefined): string {
  const parts = String(name || "").trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const MODO_ICON: Record<ModoAtendimento, typeof Bot> = {
  ia: Bot,
  humano: User,
  pendente: Clock,
};

const MODO_BADGE_CLASS: Record<ModoAtendimento, string> = {
  ia: "border-[#c9a84c]/40 bg-[#c9a84c]/10 text-[#c9a84c]",
  humano: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  pendente: "border-orange-500/40 bg-orange-500/10 text-orange-400",
};

function ModoBadge({ modo }: { modo: ModoAtendimento }) {
  const Icon = MODO_ICON[modo];
  return (
    <Badge className={cn("gap-1", MODO_BADGE_CLASS[modo])}>
      <Icon className="h-3 w-3" />
      {MODO_ATENDIMENTO_LABELS[modo]}
    </Badge>
  );
}

function formatAgendado(iso: string): string {
  const date = new Date(iso);
  const dia = String(date.getDate()).padStart(2, "0");
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const hora = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dia}/${mes} ${hora}:${min}`;
}

function ChatBubble({
  mensagem,
  onCancelarAgendamento,
}: {
  mensagem: Mensagem;
  onCancelarAgendamento: (id: string) => void;
}) {
  if (mensagem.nota_interna) {
    return (
      <div className="flex justify-center">
        <div className="max-w-md rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
          <span className="font-medium">📝 Nota interna —</span> {mensagem.conteudo}
        </div>
      </div>
    );
  }

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
  const cancelado = mensagem.acao_executada === "cancelado";
  const agendadoPendente =
    mensagem.agendado_para && mensagem.acao_executada == null;

  return (
    <div className={cn("flex flex-col gap-1", isAssistente ? "items-end" : "items-start")}>
      {mensagem.agendado_para && (
        <div className="flex items-center gap-2">
          <Badge className="gap-1 border-orange-500/40 bg-orange-500/10 text-orange-400">
            <Clock className="h-3 w-3" />
            {cancelado ? "Cancelada" : `Agendada para ${formatAgendado(mensagem.agendado_para)}`}
          </Badge>
          {agendadoPendente && (
            <button
              onClick={() => onCancelarAgendamento(mensagem.id)}
              className="text-white/40 transition-colors hover:text-red-400"
              aria-label="Cancelar agendamento"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
      <div
        className={cn(
          "max-w-md rounded-lg px-4 py-3 text-sm",
          isAssistente
            ? "rounded-tr-none bg-[#c9a84c]/20 text-white"
            : "rounded-tl-none bg-white/5 text-white",
          cancelado && "opacity-40 line-through"
        )}
      >
        {mensagem.conteudo || ""}
        <p className="mt-1 text-[10px] text-white/30">
          {mensagem.enviado_em
            ? formatDistanceToNow(new Date(mensagem.enviado_em), {
                addSuffix: true,
                locale: ptBR,
              })
            : ""}
        </p>
      </div>
    </div>
  );
}

function QuickMessagesPopover({
  mensagens,
  filtro,
  onSelect,
}: {
  mensagens: MensagemRapida[];
  filtro: string;
  onSelect: (mensagem: MensagemRapida) => void;
}) {
  const filtradas = (Array.isArray(mensagens) ? mensagens : []).filter(
    (m) =>
      m.ativo &&
      (filtro === "" ||
        m.atalho?.toLowerCase().includes(filtro.toLowerCase()) ||
        String(m.titulo || "").toLowerCase().includes(filtro.toLowerCase()))
  );

  if (filtradas.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-full max-w-sm overflow-hidden rounded-lg border border-white/10 bg-[#1a1a1a] shadow-xl">
      {filtradas.map((mensagem) => (
        <button
          key={mensagem.id}
          onClick={() => onSelect(mensagem)}
          className="flex w-full flex-col items-start gap-0.5 border-b border-white/5 px-3 py-2 text-left last:border-0 hover:bg-white/5"
        >
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-sm font-medium text-white">{mensagem.titulo}</span>
            <Badge variant="muted">{mensagem.tipo}</Badge>
          </div>
          {mensagem.atalho && (
            <span className="text-xs text-[#c9a84c]">{mensagem.atalho}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function ConversationsView() {
  const [departamentoFiltro, setDepartamentoFiltro] = useState<string>("TODOS");
  const { departamentos } = useDepartamentos();
  const { messages: rawMessages, isLoading } = useRecentMessages(
    departamentoFiltro === "TODOS" ? null : departamentoFiltro
  );
  const messages = Array.isArray(rawMessages) ? rawMessages : [];
  const { user } = useSession();
  const podeEnviar = user?.perfil !== "estagio";
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [notaMode, setNotaMode] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleValue, setScheduleValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeLeadId = selectedLeadId ?? messages[0]?.lead_id ?? null;

  const { lead, isLoading: isLoadingLead, mutate } = useLead(activeLeadId);
  const { mensagensRapidas } = useMensagensRapidas(lead?.departamento_id);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lead?.mensagens?.length]);

  useEffect(() => {
    setNotaMode(false);
    setScheduleOpen(false);
    setScheduleValue("");
    setDraft("");
  }, [activeLeadId]);

  const quickFiltro = draft.startsWith("/") ? draft.slice(1) : null;

  const handleSelectQuickMessage = async (mensagem: MensagemRapida) => {
    if (!activeLeadId) return;

    if (mensagem.tipo === "texto") {
      setDraft(mensagem.conteudo ?? "");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/mensagens/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: activeLeadId,
          mensagem: mensagem.midia_url,
          tipo: mensagem.tipo,
        }),
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

  const handleModo = async (modo: ModoAtendimento) => {
    if (!activeLeadId) return;
    try {
      const res = await fetch(`/api/leads/${activeLeadId}/modo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo }),
      });
      if (!res.ok) throw new Error();
      await mutate();
      toast.success(
        modo === "ia"
          ? "Devolvido para a Aline."
          : modo === "humano"
            ? "Atendimento assumido."
            : "Conversa marcada como pendente."
      );
    } catch {
      toast.error("Não foi possível atualizar o modo de atendimento.");
    }
  };

  const handleCancelarAgendamento = async (mensagemId: string) => {
    try {
      const res = await fetch(`/api/mensagens/${mensagemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao_executada: "cancelado" }),
      });
      if (!res.ok) throw new Error();
      await mutate();
      toast.success("Agendamento cancelado.");
    } catch {
      toast.error("Não foi possível cancelar o agendamento.");
    }
  };

  const handleSend = async () => {
    const conteudo = draft.trim();
    if (!conteudo || !activeLeadId) return;

    setSending(true);
    try {
      if (notaMode) {
        const res = await fetch("/api/mensagens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_id: activeLeadId,
            conteudo,
            nota_interna: true,
            role: "sistema",
          }),
        });
        if (!res.ok) {
          const bodyRes = await res.json().catch(() => null);
          toast.error(bodyRes?.error ?? "Erro ao adicionar nota.");
          return;
        }
        setDraft("");
        setNotaMode(false);
        await mutate();
        return;
      }

      if (scheduleOpen && scheduleValue) {
        const agendadoPara = new Date(scheduleValue).toISOString();
        const res = await fetch("/api/mensagens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_id: activeLeadId,
            conteudo,
            agendado_para: agendadoPara,
          }),
        });
        if (!res.ok) {
          const bodyRes = await res.json().catch(() => null);
          toast.error(bodyRes?.error ?? "Erro ao agendar mensagem.");
          return;
        }
        setDraft("");
        setScheduleOpen(false);
        setScheduleValue("");
        await mutate();
        toast.success("Mensagem agendada.");
        return;
      }

      const res = await fetch("/api/mensagens/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: activeLeadId, mensagem: conteudo }),
      });

      if (!res.ok) {
        const bodyRes = await res.json().catch(() => null);
        toast.error(bodyRes?.error ?? "Erro ao enviar mensagem.");
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
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3">
      <select
        value={departamentoFiltro}
        onChange={(e) => setDepartamentoFiltro(e.target.value)}
        className="w-fit rounded-md border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
      >
        <option value="TODOS">Todos os departamentos</option>
        {departamentos.map((dep) => (
          <option key={dep.id} value={dep.id}>
            {dep.nome}
          </option>
        ))}
      </select>

      <div className="flex flex-1 gap-4 overflow-hidden">
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
                          {message.lead_nome || "Lead"}
                        </p>
                        <Badge
                          variant={message.instancia === "ads" ? "ads" : "indicacoes"}
                        >
                          {message.instancia || "indicacoes"}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-white/50">
                        {message.conteudo || ""}
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
              <div className="flex flex-col gap-3 border-b border-white/10 px-6 py-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback>{initials(lead.nome)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-white">{lead.nome}</p>
                    <p className="text-xs text-white/40">{lead.numero_whatsapp}</p>
                  </div>
                  <ModoBadge modo={lead.modo_atendimento} />
                  <Badge
                    variant={lead.instancia === "ads" ? "ads" : "indicacoes"}
                    className="ml-auto"
                  >
                    {lead.instancia}
                  </Badge>
                </div>

                {podeEnviar && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleModo("humano")}
                      disabled={lead.modo_atendimento === "humano"}
                      className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Assumir atendimento
                    </button>
                    <button
                      onClick={() => handleModo("ia")}
                      disabled={lead.modo_atendimento === "ia"}
                      className="rounded-md border border-[#c9a84c]/30 bg-[#c9a84c]/10 px-2 py-1 text-xs text-[#c9a84c] transition-colors hover:bg-[#c9a84c]/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Devolver para IA
                    </button>
                    <button
                      onClick={() => handleModo("pendente")}
                      disabled={lead.modo_atendimento === "pendente"}
                      className="rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-xs text-orange-400 transition-colors hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Marcar como pendente
                    </button>
                  </div>
                )}
              </div>

              <div
                ref={scrollRef}
                className="flex flex-1 flex-col gap-3 overflow-y-auto p-6"
              >
                {(!Array.isArray(lead.mensagens) || lead.mensagens.length === 0) && (
                  <p className="text-center text-sm text-white/40">
                    Nenhuma mensagem ainda.
                  </p>
                )}
                {(Array.isArray(lead.mensagens) ? lead.mensagens : []).map((mensagem) => (
                  <ChatBubble
                    key={mensagem.id}
                    mensagem={mensagem}
                    onCancelarAgendamento={handleCancelarAgendamento}
                  />
                ))}
              </div>

              {podeEnviar ? (
                <div className="flex flex-col gap-2 border-t border-white/10 px-6 py-4">
                  {scheduleOpen && (
                    <div className="flex items-center gap-2">
                      <input
                        type="datetime-local"
                        value={scheduleValue}
                        onChange={(e) => setScheduleValue(e.target.value)}
                        className="rounded-md border border-orange-500/30 bg-[#0f0f0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <span className="text-xs text-white/40">
                        A mensagem será enviada automaticamente nesse horário.
                      </span>
                    </div>
                  )}
                  <div className="relative flex items-center gap-2">
                    {quickFiltro !== null && (
                      <QuickMessagesPopover
                        mensagens={mensagensRapidas}
                        filtro={quickFiltro}
                        onSelect={handleSelectQuickMessage}
                      />
                    )}
                    <button
                      onClick={() => {
                        setNotaMode((v) => !v);
                        setScheduleOpen(false);
                      }}
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors",
                        notaMode
                          ? "bg-yellow-500/20 text-yellow-300"
                          : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                      aria-label="Adicionar nota interna"
                    >
                      <StickyNote className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setScheduleOpen((v) => !v);
                        setNotaMode(false);
                      }}
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors",
                        scheduleOpen
                          ? "bg-orange-500/20 text-orange-400"
                          : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                      aria-label="Agendar mensagem"
                    >
                      <Clock className="h-4 w-4" />
                    </button>
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={
                        notaMode ? "Adicionar nota interna..." : "Escreva uma mensagem..."
                      }
                      className={cn(
                        "flex-1 rounded-md border px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2",
                        notaMode
                          ? "border-yellow-500/30 bg-yellow-500/5 focus:ring-yellow-500"
                          : "border-white/10 bg-[#0f0f0f] focus:ring-[#c9a84c]"
                      )}
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
                </div>
              ) : (
                <div className="border-t border-white/10 px-6 py-4 text-center text-xs text-white/40">
                  Seu perfil tem acesso somente para visualização.
                </div>
              )}
            </>
          )}

          {!isLoadingLead && !lead && (
            <div className="flex flex-1 items-center justify-center text-sm text-white/40">
              Nenhuma conversa encontrada.
            </div>
          )}
        </div>
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
