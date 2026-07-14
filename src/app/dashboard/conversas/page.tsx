"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Archive, Bot, Clock, RotateCcw, Send, StickyNote, User, X, Mic, Paperclip, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";
import { AnimatePresence, motion } from "framer-motion";

import {
  useDepartamentos,
  useLead,
  useMensagensRapidas,
  useEstagios,
} from "@/hooks/useDashboard";
import { useSession } from "@/hooks/useSession";
import { useLeadsFiltros } from "@/hooks/useLeadsFiltros";
import type {
  EstagioCustomizado,
  LeadComMensagens,
  Mensagem,
  MensagemRapida,
  ModoAtendimento,
} from "@/types";
import { MODO_ATENDIMENTO_LABELS } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { FiltrosButton, FiltrosPanel } from "@/components/dashboard/FiltrosPanel";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

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

function MessageBubbleContent({
  mensagem,
  onOpenLightbox,
}: {
  mensagem: Mensagem;
  onOpenLightbox: (url: string) => void;
}) {
  if (mensagem.tipo === "audio" && mensagem.midia_url) {
    return (
      <div className="py-1">
        <audio src={mensagem.midia_url} controls className="max-w-full outline-none" />
      </div>
    );
  }

  if (mensagem.tipo === "imagem" && mensagem.midia_url) {
    return (
      <div className="py-1">
        <img
          src={mensagem.midia_url}
          alt="Imagem"
          className="max-h-60 rounded-md cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onOpenLightbox(mensagem.midia_url!)}
        />
      </div>
    );
  }

  if (mensagem.tipo === "documento" && mensagem.midia_url) {
    return (
      <div className="py-1 flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 min-w-[200px] max-w-sm">
        <FileText className="h-8 w-8 text-[#c9a84c] shrink-0" />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-white truncate">
            {mensagem.conteudo || "Documento"}
          </span>
          <span className="text-[10px] text-white/40">Documento</span>
        </div>
        <a
          href={mensagem.midia_url}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="h-4 w-4" />
        </a>
      </div>
    );
  }

  return <span>{mensagem.conteudo || ""}</span>;
}

function ChatBubble({
  mensagem,
  leadName,
  onCancelarAgendamento,
  onOpenLightbox,
}: {
  mensagem: Mensagem;
  leadName: string;
  onCancelarAgendamento: (id: string) => void;
  onOpenLightbox: (url: string) => void;
}) {
  if (mensagem.nota_interna) {
    return (
      <div className="flex justify-center my-2">
        <div className="flex items-start gap-2 max-w-md rounded-lg border border-yellow-200 bg-yellow-100 px-4 py-3 text-sm text-yellow-900 shadow-sm">
          <StickyNote className="h-4 w-4 shrink-0 mt-0.5 text-yellow-700" />
          <div>
            <span className="font-semibold">Nota interna:</span> {mensagem.conteudo}
          </div>
        </div>
      </div>
    );
  }

  const isMedia = mensagem.tipo === "audio" || mensagem.tipo === "imagem" || mensagem.tipo === "documento";

  if (mensagem.role === "sistema" && !isMedia) {
    return (
      <div className="flex justify-center my-1">
        <span className="rounded-full bg-zinc-200 text-zinc-900 px-3 py-1 text-[11px] font-medium italic shadow-sm">
          {mensagem.conteudo}
        </span>
      </div>
    );
  }

  const isAssistente = mensagem.role === "assistente" || (mensagem.role === "sistema" && isMedia);
  const isLead = mensagem.role === "lead";

  if (!isAssistente && !isLead) {
    return null; // Nunca mostre mensagens sem identificação de remetente
  }

  const cancelado = mensagem.acao_executada === "cancelado";
  const agendadoPendente =
    mensagem.agendado_para && mensagem.acao_executada == null;

  if (isLead) {
    return (
      <div className="flex items-start gap-2.5 my-2 justify-start">
        <Avatar className="h-8 w-8 shrink-0 bg-neutral-800 text-neutral-300">
          <AvatarFallback className="bg-neutral-800 text-neutral-300 text-xs font-semibold">
            {initials(leadName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1 max-w-[70%]">
          <span className="text-[11px] font-medium text-white/50 px-1">
            {leadName || "Lead"}
          </span>
          <div className={cn(
            "rounded-lg rounded-tl-none bg-zinc-800/80 text-white shadow-sm",
            mensagem.tipo === "audio" ? "p-1.5" : "px-4 py-2.5 text-sm"
          )}>
            <MessageBubbleContent mensagem={mensagem} onOpenLightbox={onOpenLightbox} />
            <p className="mt-1 text-[10px] text-white/30 text-right">
              {mensagem.enviado_em
                ? formatDistanceToNow(new Date(mensagem.enviado_em), {
                    addSuffix: true,
                    locale: ptBR,
                  })
                : ""}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // assistente
  return (
    <div className="flex items-start gap-2.5 my-2 justify-end">
      <div className="flex flex-col gap-1 items-end max-w-[70%]">
        <span className="text-[11px] font-medium text-[#c9a84c] px-1">
          Aline
        </span>
        {mensagem.agendado_para && (
          <div className="flex items-center gap-2 mb-1">
            <Badge className="gap-1 border-orange-500/40 bg-orange-500/10 text-orange-400 text-[10px]">
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
            "rounded-lg rounded-tr-none bg-[#c9a84c]/20 text-white shadow-sm border border-[#c9a84c]/10",
            mensagem.tipo === "audio" ? "p-1.5" : "px-4 py-2.5 text-sm",
            cancelado && "opacity-40 line-through"
          )}
        >
          <MessageBubbleContent mensagem={mensagem} onOpenLightbox={onOpenLightbox} />
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
      <Avatar className="h-8 w-8 shrink-0 bg-[#c9a84c] text-black">
        <AvatarFallback className="bg-[#c9a84c] text-black text-xs font-bold">
          AI
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 my-2 justify-end">
      <div className="flex flex-col gap-1 items-end">
        <span className="text-[11px] font-medium text-[#c9a84c] px-1">
          Aline
        </span>
        <div className="rounded-lg rounded-tr-none bg-[#c9a84c]/20 border border-[#c9a84c]/10 px-4 py-3 text-sm shadow-sm flex items-center gap-1">
          <span className="text-white/70 mr-1">Aline está digitando</span>
          <div className="flex gap-1 items-center">
            <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
      <Avatar className="h-8 w-8 shrink-0 bg-[#c9a84c] text-black">
        <AvatarFallback className="bg-[#c9a84c] text-black text-xs font-bold">
          AI
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

function StageDropdown({
  lead,
  estagios,
  estagiosMap,
  onUpdate,
}: {
  lead: LeadComMensagens;
  estagios: EstagioCustomizado[];
  estagiosMap: Map<string, { nome: string; cor: string }>;
  onUpdate: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentEstagio, setCurrentEstagio] = useState(lead.estagio);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentEstagio(lead.estagio);
  }, [lead.estagio]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const stage = estagiosMap.get(currentEstagio) ?? {
    nome: currentEstagio || "Recepção",
    cor: "#6b7280",
  };

  const handleSelect = async (slug: string, nome: string) => {
    setIsOpen(false);
    const originalEstagio = currentEstagio;
    setCurrentEstagio(slug);
    
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estagio: slug }),
      });
      if (!res.ok) throw new Error();
      
      toast.success(`Estágio atualizado para ${nome}`);
      onUpdate();
    } catch {
      setCurrentEstagio(originalEstagio);
      toast.error("Erro ao atualizar o estágio.");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-80 focus:outline-none"
        style={{ backgroundColor: stage.cor }}
      >
        <span>{stage.nome}</span>
        <span className="text-[10px] opacity-70">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 z-50 w-48 rounded-md border border-white/10 bg-[#1a1a1a] shadow-xl py-1">
          {estagios.map((est) => (
            <button
              key={est.id}
              onClick={() => handleSelect(est.slug, est.nome)}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left text-xs text-white hover:bg-white/5",
                currentEstagio === est.slug && "bg-white/10 font-semibold"
              )}
            >
              <span>{est.nome}</span>
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: est.cor }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DepartamentoDropdown({
  lead,
  departamentos,
  onUpdate,
}: {
  lead: LeadComMensagens;
  departamentos: { id: string; nome: string; cor: string }[];
  onUpdate: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const atual = departamentos.find((d) => d.id === lead.departamento_id);

  const handleSelect = async (departamentoId: string, nome: string) => {
    setIsOpen(false);
    if (departamentoId === lead.departamento_id) return;

    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departamento_id: departamentoId }),
      });
      if (!res.ok) throw new Error();

      toast.success(`Lead transferido para ${nome}`);
      onUpdate();
    } catch {
      toast.error("Erro ao transferir o lead.");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-xs font-medium text-white/80 transition-colors hover:bg-white/5 focus:outline-none"
      >
        {atual && (
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: atual.cor }} />
        )}
        <span>{atual?.nome ?? "Sem departamento"}</span>
        <span className="text-[10px] opacity-70">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 z-50 w-52 rounded-md border border-white/10 bg-[#1a1a1a] shadow-xl py-1">
          {departamentos.map((dep) => (
            <button
              key={dep.id}
              onClick={() => handleSelect(dep.id, dep.nome)}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left text-xs text-white hover:bg-white/5",
                lead.departamento_id === dep.id && "bg-white/10 font-semibold"
              )}
            >
              <span>{dep.nome}</span>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dep.cor }} />
            </button>
          ))}
        </div>
      )}
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
    <div className="absolute bottom-full left-0 mb-2 w-full max-w-sm overflow-hidden rounded-lg border border-white/10 bg-[#1a1a1a] shadow-xl z-50">
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
  const [activeTab, setActiveTab] = useState<"ia" | "pendente" | "humano" | "arquivado">("ia");
  const [departamentoFiltro, setDepartamentoFiltro] = useState<string>("TODOS");
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const { filtros, aplicarFiltros, limparFiltros, totalAtivos } = useLeadsFiltros("conversas");
  const { departamentos } = useDepartamentos();
  const { estagios } = useEstagios();
  const { user } = useSession();
  const podeEnviar = user?.perfil !== "estagio";
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const leadParam = searchParams.get("lead");
  const appliedLeadParamRef = useRef(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [notaMode, setNotaMode] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleValue, setScheduleValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  const filtrosExtras = useMemo(() => {
    const params = new URLSearchParams();
    if (filtros.estagio.length) params.set("estagio", filtros.estagio.join(","));
    if (filtros.instancia.length) params.set("instancia", filtros.instancia.join(","));
    if (filtros.criado_de) params.set("criado_de", filtros.criado_de);
    if (filtros.criado_ate) params.set("criado_ate", filtros.criado_ate);
    if (filtros.contato_de) params.set("contato_de", filtros.contato_de);
    if (filtros.contato_ate) params.set("contato_ate", filtros.contato_ate);
    if (filtros.tem_contrato) params.set("tem_contrato", filtros.tem_contrato);
    if (filtros.busca) params.set("busca", filtros.busca);
    return params.toString();
  }, [filtros]);
  const extraQs = filtrosExtras ? `&${filtrosExtras}` : "";

  const iaQuery = `/api/leads?modo_atendimento=ia&status=ativo${departamentoFiltro !== "TODOS" ? `&departamento_id=${departamentoFiltro}` : ""}${extraQs}`;
  const pendenteQuery = `/api/leads?modo_atendimento=pendente&status=ativo${departamentoFiltro !== "TODOS" ? `&departamento_id=${departamentoFiltro}` : ""}${extraQs}`;
  const humanoQuery = `/api/leads?modo_atendimento=humano&status=ativo${departamentoFiltro !== "TODOS" ? `&departamento_id=${departamentoFiltro}` : ""}${extraQs}`;
  const arquivadoQuery = `/api/leads?status=arquivado${departamentoFiltro !== "TODOS" ? `&departamento_id=${departamentoFiltro}` : ""}${extraQs}`;

  const { data: iaLeadsRaw, mutate: mutateIA } = useSWR<any[]>(iaQuery, apiFetch);
  const { data: pendenteLeadsRaw, mutate: mutatePendente } = useSWR<any[]>(pendenteQuery, apiFetch);
  const { data: humanoLeadsRaw, mutate: mutateHumano } = useSWR<any[]>(humanoQuery, apiFetch);
  const { data: arquivadoLeadsRaw, mutate: mutateArquivado } = useSWR<any[]>(arquivadoQuery, apiFetch);

  const iaLeads = iaLeadsRaw ?? [];
  const pendenteLeads = pendenteLeadsRaw ?? [];
  const humanoLeads = humanoLeadsRaw ?? [];
  const arquivadoLeads = arquivadoLeadsRaw ?? [];

  const mutateAllLists = () => {
    mutateIA();
    mutatePendente();
    mutateHumano();
    mutateArquivado();
  };

  const currentLeads = useMemo(() => {
    switch (activeTab) {
      case "ia":
        return iaLeads;
      case "pendente":
        return pendenteLeads;
      case "humano":
        return humanoLeads;
      case "arquivado":
        return arquivadoLeads;
      default:
        return [];
    }
  }, [activeTab, iaLeads, pendenteLeads, humanoLeads, arquivadoLeads]);

  const currentLoading = {
    ia: iaLeadsRaw === undefined,
    pendente: pendenteLeadsRaw === undefined,
    humano: humanoLeadsRaw === undefined,
    arquivado: arquivadoLeadsRaw === undefined,
  }[activeTab];

  // Abre direto o lead vindo de ?lead=ID (ex: botão "abrir conversa" na lista de leads)
  useEffect(() => {
    if (!leadParam || appliedLeadParamRef.current) return;
    appliedLeadParamRef.current = true;
    setSelectedLeadId(leadParam);
  }, [leadParam]);

  // Seleciona automaticamente o primeiro lead da aba atual quando ela muda ou quando a lista carrega
  useEffect(() => {
    if (leadParam && selectedLeadId === leadParam) return;
    const leadExistsInTab = currentLeads.some((l) => l.id === selectedLeadId);
    if (!leadExistsInTab && currentLeads.length > 0) {
      setSelectedLeadId(currentLeads[0].id);
    } else if (currentLeads.length === 0) {
      setSelectedLeadId(null);
    }
  }, [activeTab, currentLeads, selectedLeadId, leadParam]);

  const activeLeadId = selectedLeadId ?? currentLeads[0]?.id ?? null;

  const { lead, isLoading: isLoadingLead, mutate } = useLead(activeLeadId);
  const { mensagensRapidas } = useMensagensRapidas(lead?.departamento_id);

  const estagiosMap = useMemo(() => {
    const map = new Map<string, { nome: string; cor: string }>();
    for (const est of estagios) {
      map.set(est.slug, { nome: est.nome, cor: est.cor });
    }
    return map;
  }, [estagios]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lead?.mensagens?.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleCancelFile = () => {
    setSelectedFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [filePreviewUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mimeType = MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/ogg";
      const options = { mimeType };

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: options.mimeType });
        if (audioBlob.size > 0) {
          await uploadAudio(audioBlob);
        }
      };
      
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
      
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      toast.error("Não foi possível acessar o microfone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording(false);
  };

  const uploadAudio = async (blob: Blob) => {
    if (!activeLeadId) return;
    setSending(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        
        const res = await fetch("/api/mensagens/midia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_id: activeLeadId,
            tipo: "audio",
            dados: base64data,
            mime_type: blob.type,
            instancia: lead?.instancia || "",
          }),
        });
        
        if (!res.ok) {
          const bodyRes = await res.json().catch(() => null);
          toast.error(bodyRes?.error ?? "Erro ao enviar áudio.");
          return;
        }
        
        await mutate();
      };
    } catch (err) {
      toast.error("Erro ao processar áudio.");
    } finally {
      setSending(false);
    }
  };

  const pressStartTimeRef = useRef<number>(0);
  const holdTimeoutRef = useRef<any>(null);
  const isHoldingRef = useRef<boolean>(false);

  const handleMicPress = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    pressStartTimeRef.current = Date.now();
    isHoldingRef.current = false;

    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
    }

    holdTimeoutRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      if (!isRecording) {
        startRecording();
      }
    }, 450);
  };

  const handleMicRelease = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (isHoldingRef.current) {
      if (isRecording) {
        stopRecording();
      }
    } else {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  };

  useEffect(() => {
    setNotaMode(false);
    setScheduleOpen(false);
    setScheduleValue("");
    setDraft("");
    handleCancelFile();
  }, [activeLeadId]);

  const quickFiltro = draft.startsWith("/") ? draft.slice(1) : null;

  const formatRelativeTime = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      return formatDistanceToNow(new Date(isoString), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "";
    }
  };

  const truncateText = (text?: string | null, length = 40) => {
    if (!text) return "";
    return text.length > length ? text.substring(0, length) + "..." : text;
  };

  const ultimoContatoStr = useMemo(() => {
    if (!lead) return "";
    const msgs = lead.mensagens ?? [];
    if (msgs.length === 0) {
      return formatRelativeTime(lead.atualizado_em);
    }
    const chatMsgs = msgs.filter((m) => !m.nota_interna && (m.role === "lead" || m.role === "assistente"));
    const lastMsg = chatMsgs[chatMsgs.length - 1] ?? msgs[msgs.length - 1];
    return formatRelativeTime(lastMsg.enviado_em);
  }, [lead]);

  const shouldShowTyping = useMemo(() => {
    if (!lead || lead.modo_atendimento !== "ia") return false;

    const chatMessages = (lead.mensagens ?? []).filter(
      (m) => !m.nota_interna && (m.role === "lead" || m.role === "assistente")
    );

    if (chatMessages.length === 0) return false;

    const lastMsg = chatMessages[chatMessages.length - 1];
    if (lastMsg.role !== "lead") return false;

    const sentTime = new Date(lastMsg.enviado_em).getTime();
    const now = Date.now();
    const diffSeconds = (now - sentTime) / 1000;

    return diffSeconds >= 0 && diffSeconds < 30;
  }, [lead]);

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
      mutateAllLists();
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

  const handleArquivar = async (leadId: string) => {
    if (!window.confirm("Arquivar este atendimento? Ele ficará na aba Arquivados.")) {
      return;
    }
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "arquivado" }),
      });
      if (!res.ok) throw new Error();
      
      toast.success("Atendimento arquivado.");
      mutateAllLists();
    } catch {
      toast.error("Não foi possível arquivar o atendimento.");
    }
  };

  const handleReativar = async (leadId: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ativo" }),
      });
      if (!res.ok) throw new Error();
      
      toast.success("Atendimento reativado.");
      mutateAllLists();
    } catch {
      toast.error("Não foi possível reativar o atendimento.");
    }
  };

  const handleResetConversa = async () => {
    if (!activeLeadId) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/leads/${activeLeadId}/reset`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error ?? "Não foi possível resetar a conversa.");
        return;
      }
      setDraft("");
      setResetConfirmOpen(false);
      await mutate();
      mutateAllLists();
      toast.success("Conversa resetada.");
    } catch {
      toast.error("Erro de conexão ao resetar a conversa.");
    } finally {
      setResetting(false);
    }
  };

  const handleSend = async () => {
    if (!activeLeadId) return;

    if (draft.trim().toLowerCase() === "/reset") {
      setResetConfirmOpen(true);
      return;
    }

    if (selectedFile) {
      setSending(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("lead_id", activeLeadId);

        const res = await fetch("/api/mensagens/midia", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const bodyRes = await res.json().catch(() => null);
          toast.error(bodyRes?.error ?? "Erro ao enviar arquivo.");
          return;
        }

        handleCancelFile();
        await mutate();
        return;
      } catch {
        toast.error("Erro de conexão ao enviar arquivo.");
        return;
      } finally {
        setSending(false);
      }
    }

    const conteudo = draft.trim();
    if (!conteudo) return;

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
      <div className="flex items-center gap-2">
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

        <FiltrosButton totalAtivos={totalAtivos} onClick={() => setFiltrosOpen(true)} />
      </div>

      <FiltrosPanel
        open={filtrosOpen}
        onOpenChange={setFiltrosOpen}
        filtros={filtros}
        onAplicar={aplicarFiltros}
        onLimpar={limparFiltros}
      />

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Sidebar */}
        <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
          {/* Tabs */}
          <div className="grid grid-cols-4 border-b border-white/10 text-xs shrink-0">
            <button
              onClick={() => setActiveTab("ia")}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-3 border-b-2 font-medium transition-colors cursor-pointer",
                activeTab === "ia"
                  ? "border-[#c9a84c] text-white bg-white/5"
                  : "border-transparent text-white/50 hover:text-white"
              )}
            >
              <Bot className="h-4 w-4 text-[#c9a84c]" />
              <span className="flex items-center gap-1">
                IA <span className="text-[10px] opacity-70">({iaLeads.length})</span>
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab("pendente")}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-3 border-b-2 font-medium transition-colors cursor-pointer",
                activeTab === "pendente"
                  ? "border-orange-500 text-white bg-white/5"
                  : "border-transparent text-white/50 hover:text-white"
              )}
            >
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="flex items-center gap-1">
                Pendente
                <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                  {pendenteLeads.length}
                </span>
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab("humano")}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-3 border-b-2 font-medium transition-colors cursor-pointer",
                activeTab === "humano"
                  ? "border-emerald-500 text-white bg-white/5"
                  : "border-transparent text-white/50 hover:text-white"
              )}
            >
              <User className="h-4 w-4 text-emerald-500" />
              <span className="flex items-center gap-1">
                Humano <span className="text-[10px] opacity-70">({humanoLeads.length})</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab("arquivado")}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-3 border-b-2 font-medium transition-colors cursor-pointer",
                activeTab === "arquivado"
                  ? "border-zinc-500 text-white bg-white/5"
                  : "border-transparent text-white/50 hover:text-white"
              )}
            >
              <Archive className="h-4 w-4 text-zinc-400" />
              <span className="flex items-center gap-1">
                Arquiv. <span className="text-[10px] opacity-70">({arquivadoLeads.length})</span>
              </span>
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {currentLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))}

            {!currentLoading && (
              <div className="flex flex-col">
                <AnimatePresence mode="popLayout">
                  {currentLeads.map((leadItem) => {
                    const isSelected = activeLeadId === leadItem.id;
                    const stage = estagiosMap.get(leadItem.estagio) ?? {
                      nome: leadItem.estagio || "Recepção",
                      cor: "#6b7280",
                    };
                    return (
                      <motion.div
                        key={leadItem.id}
                        layout
                        initial={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, x: -100, scale: 0.9, transition: { duration: 0.2 } }}
                      >
                        <button
                          onClick={() => setSelectedLeadId(leadItem.id)}
                          className={cn(
                            "flex flex-col w-full gap-1 border-b border-white/5 px-4 py-3 text-left transition-colors cursor-pointer hover:bg-white/5",
                            isSelected && "bg-[#c9a84c]/10"
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <p className="truncate text-sm font-medium text-white max-w-[70%]">
                              {leadItem.nome || "Lead"}
                            </p>
                            <span className="text-[10px] text-white/40 shrink-0">
                              {formatRelativeTime(leadItem.ultima_mensagem_enviado_em || leadItem.atualizado_em)}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between w-full gap-2">
                            <p className="truncate text-xs text-white/50 flex-1">
                              {truncateText(leadItem.ultima_mensagem_conteudo) || (
                                <span className="italic text-white/30">Sem mensagens</span>
                              )}
                            </p>
                            <span
                              className="rounded px-1.5 py-0.5 text-[9px] font-semibold text-white shrink-0"
                              style={{ backgroundColor: stage.cor }}
                            >
                              {stage.nome}
                            </span>
                          </div>
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {!currentLoading && currentLeads.length === 0 && (
              <p className="p-4 text-sm text-white/40 text-center">
                Nenhuma conversa encontrada.
              </p>
            )}
          </div>
        </div>

        {/* Chat Thread */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
          {isLoadingLead && (
            <div className="flex flex-col gap-3 p-6">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-24 w-2/3" />
            </div>
          )}

          {!isLoadingLead && lead && (
            <>
              {/* Header */}
              <div className="flex flex-col gap-3 border-b border-white/10 px-6 py-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback>{initials(lead.nome)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <h1 className="text-lg font-bold text-white tracking-tight">{lead.nome}</h1>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-white/40">
                      <span>{lead.numero_whatsapp}</span>
                      <span>•</span>
                      <span>Último contato: {ultimoContatoStr}</span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 ml-2">
                    {/* Stage Dropdown (Clickable Badge) */}
                    <StageDropdown
                      lead={lead}
                      estagios={estagios}
                      estagiosMap={estagiosMap}
                      onUpdate={mutateAllLists}
                    />
                    
                    {/* Modo Atendimento Badge */}
                    <ModoBadge modo={lead.modo_atendimento} />
                    
                    {/* Instancia Badge */}
                    <Badge variant={lead.instancia === "ads" ? "ads" : "indicacoes"} className="text-[10px] px-2 py-0.5 uppercase">
                      {lead.instancia === "ads" ? "ADS" : "INDICAÇÕES"}
                    </Badge>

                    {/* Departamento (transferir) */}
                    <DepartamentoDropdown
                      lead={lead}
                      departamentos={departamentos}
                      onUpdate={() => {
                        mutateAllLists();
                        mutate();
                      }}
                    />
                  </div>

                  {/* Header Actions: Archive / Reactivate */}
                  <div className="ml-auto flex items-center gap-2">
                    {lead.status === "arquivado" ? (
                      <button
                        onClick={() => handleReativar(lead.id)}
                        className="flex items-center gap-1.5 rounded-md border border-zinc-500/30 bg-zinc-500/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors cursor-pointer hover:bg-zinc-500/20"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reativar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleArquivar(lead.id)}
                        className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors cursor-pointer hover:bg-red-500/20"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Arquivar
                      </button>
                    )}
                  </div>
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

              {/* Message Thread */}
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
                    leadName={lead.nome}
                    onCancelarAgendamento={handleCancelarAgendamento}
                    onOpenLightbox={setLightboxUrl}
                  />
                ))}
                {shouldShowTyping && <TypingIndicator />}
              </div>

              {/* Message Input */}
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

                  {/* File Preview */}
                  {selectedFile && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 max-w-sm mb-2">
                      {filePreviewUrl ? (
                        <img src={filePreviewUrl} alt="Preview" className="h-12 w-12 rounded object-cover" />
                      ) : (
                        <FileText className="h-8 w-8 text-[#c9a84c] shrink-0" />
                      )}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-medium text-white truncate">{selectedFile.name}</span>
                        <span className="text-[10px] text-white/40">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      <button
                        onClick={handleCancelFile}
                        className="text-white/50 hover:text-white transition-colors p-1"
                        aria-label="Cancelar anexo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Recording overlay / Wave animation */}
                  {isRecording && (
                    <div className="flex items-center gap-3 p-2 rounded-lg border border-red-500/20 bg-red-500/5 mb-2 max-w-xs animate-pulse">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      <span className="text-xs font-semibold text-red-400">Gravando: {recordingTime}s</span>
                      <div className="flex items-end gap-0.5 h-3 shrink-0">
                        <span className="w-0.5 bg-red-500 rounded-full animate-[pulse_1s_infinite_100ms] h-2" />
                        <span className="w-0.5 bg-red-500 rounded-full animate-[pulse_1s_infinite_300ms] h-3" />
                        <span className="w-0.5 bg-red-500 rounded-full animate-[pulse_1s_infinite_500ms] h-1.5" />
                        <span className="w-0.5 bg-red-500 rounded-full animate-[pulse_1s_infinite_700ms] h-3" />
                        <span className="w-0.5 bg-red-500 rounded-full animate-[pulse_1s_infinite_900ms] h-2" />
                      </div>
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

                    {/* Hidden File Input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*,application/pdf,.doc,.docx"
                    />

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

                    {/* Paperclip Button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white/50 hover:bg-white/5 hover:text-white transition-colors"
                      aria-label="Anexar arquivo"
                    >
                      <Paperclip className="h-4 w-4" />
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

                    {/* Microphone Button */}
                    <button
                      onMouseDown={handleMicPress}
                      onMouseUp={handleMicRelease}
                      onTouchStart={handleMicPress}
                      onTouchEnd={handleMicRelease}
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors",
                        isRecording
                          ? "bg-red-500 text-white animate-pulse"
                          : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                      aria-label="Gravar áudio"
                    >
                      <Mic className="h-4 w-4" />
                    </button>

                    <button
                      onClick={handleSend}
                      disabled={sending || (!draft.trim() && !selectedFile)}
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
              Nenhuma conversa selecionada ou encontrada.
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Fechar visualização"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Visualização ampliada"
            className="max-h-full max-w-full rounded-md object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar conversa?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/60">
            {(lead?.mensagens?.length ?? 0)} mensagens serão apagadas permanentemente e a
            conversa voltará ao estágio inicial com o atendimento pela IA. Essa ação não pode
            ser desfeita.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setResetConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={resetting}
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={handleResetConversa}
            >
              {resetting ? "Resetando..." : "Resetar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ConversasPage() {
  return (
    <div className="p-6">
      <ErrorBoundary label="as conversas">
        <Suspense fallback={<Skeleton className="h-12 w-full" />}>
          <ConversationsView />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
