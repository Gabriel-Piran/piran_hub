"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, Clock, User } from "lucide-react";

import type { Lead, ModoAtendimento } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const MODO_ICON: Record<ModoAtendimento, typeof Bot> = {
  ia: Bot,
  humano: User,
  pendente: Clock,
};

interface LeadCardProps {
  lead: Lead;
  departamentoNome?: string;
  departamentoCor?: string;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onClick: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export function LeadCard({
  lead,
  departamentoNome,
  departamentoCor,
  selected,
  onToggleSelect,
  onClick,
  draggable,
  onDragStart,
}: LeadCardProps) {
  const ModoIcon = MODO_ICON[lead.modo_atendimento] ?? Bot;

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className="flex cursor-pointer flex-col gap-2 rounded-lg border border-white/10 bg-[#141414] p-3 transition-colors hover:border-[#c9a84c]/40"
    >
      <div className="flex items-start gap-2">
        <Checkbox checked={selected} onCheckedChange={onToggleSelect} className="mt-0.5" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-white">{lead.nome || "Sem nome"}</span>
          <span className="truncate text-xs text-white/40">{lead.numero_whatsapp}</span>
        </div>
        <ModoIcon className="h-3.5 w-3.5 shrink-0 text-white/40" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={lead.instancia === "ads" ? "ads" : "indicacoes"} className="text-[10px] px-1.5 py-0">
          {lead.instancia === "ads" ? "ADS" : "IND"}
        </Badge>
        {departamentoNome && (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-white/10 px-1.5 py-0 text-[10px] text-white/60"
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: departamentoCor }} />
            {departamentoNome}
          </span>
        )}
      </div>

      <span className="text-[11px] text-white/30">
        {formatDistanceToNow(new Date(lead.atualizado_em), { addSuffix: true, locale: ptBR })}
      </span>
    </div>
  );
}
