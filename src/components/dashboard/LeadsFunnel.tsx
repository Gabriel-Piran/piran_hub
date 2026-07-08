"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Phone } from "lucide-react";
import { toast } from "sonner";

import { useLeads } from "@/hooks/useDashboard";
import { ESTAGIO_LABELS } from "@/lib/labels";
import { LEAD_ESTAGIOS } from "@/types";
import type { Lead, LeadEstagio } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadDetailSheet } from "@/components/dashboard/LeadDetailSheet";
import { cn } from "@/lib/utils";

function LeadCardContent({ lead }: { lead: Lead }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white">{lead.nome}</p>
        <Badge variant={lead.instancia === "ads" ? "ads" : "indicacoes"}>
          {lead.instancia}
        </Badge>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-white/50">
        <Phone className="h-3 w-3" />
        {lead.numero_whatsapp}
      </p>
      <p className="text-xs text-white/40">
        Atualizado{" "}
        {formatDistanceToNow(new Date(lead.atualizado_em), {
          addSuffix: true,
          locale: ptBR,
        })}
      </p>
    </>
  );
}

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    data: { estagio: lead.estagio },
  });

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        "flex w-full flex-col gap-2 rounded-lg border border-white/10 bg-[#1a1a1a] p-3 text-left transition-colors hover:border-[#c9a84c]/40",
        isDragging && "opacity-30"
      )}
      {...listeners}
      {...attributes}
    >
      <LeadCardContent lead={lead} />
    </button>
  );
}

function Column({
  estagio,
  leads,
  isLoading,
  onSelect,
}: {
  estagio: LeadEstagio;
  leads: Lead[];
  isLoading: boolean;
  onSelect: (lead: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: estagio });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-56 shrink-0 flex-col gap-2 rounded-lg p-1 transition-colors",
        isOver && "bg-[#c9a84c]/5 ring-1 ring-[#c9a84c]/30"
      )}
    >
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
          {ESTAGIO_LABELS[estagio]}
        </p>
        <span className="rounded-full bg-white/5 px-1.5 text-[11px] text-white/40">
          {leads.length}
        </span>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto">
        {isLoading &&
          Array.from({ length: 2 }).map((_, j) => (
            <Skeleton key={j} className="h-20 w-full rounded-lg" />
          ))}

        {!isLoading &&
          leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={() => onSelect(lead)} />
          ))}

        {!isLoading && leads.length === 0 && (
          <p className="px-1 text-xs text-white/30">Sem leads</p>
        )}
      </div>
    </div>
  );
}

export function LeadsFunnel() {
  const { leads, columns, isLoading, setLeadEstagio, revalidateLeads } = useLeads();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id) ?? null;
    setActiveLead(lead);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const novoEstagio = over.id as LeadEstagio;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.estagio === novoEstagio) return;

    const estagioAnterior = lead.estagio;
    setLeadEstagio(leadId, novoEstagio);

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estagio: novoEstagio }),
      });

      if (!res.ok) {
        setLeadEstagio(leadId, estagioAnterior);
        toast.error(`Não foi possível mover ${lead.nome}.`);
        return;
      }

      toast.success(`${lead.nome} movido para ${ESTAGIO_LABELS[novoEstagio]}.`);
    } catch {
      setLeadEstagio(leadId, estagioAnterior);
      toast.error("Erro de conexão ao mover lead.");
    } finally {
      revalidateLeads();
    }
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
      <h2 className="mb-3 text-sm font-semibold text-white/80">
        Funil de leads
      </h2>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-3 overflow-x-auto pb-2">
          {LEAD_ESTAGIOS.map((estagio, i) => (
            <motion.div
              key={estagio}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03 }}
            >
              <Column
                estagio={estagio}
                leads={columns[estagio] ?? []}
                isLoading={isLoading}
                onSelect={setSelectedLead}
              />
            </motion.div>
          ))}
        </div>

        <DragOverlay>
          {activeLead && (
            <div className="flex w-56 flex-col gap-2 rounded-lg border border-[#c9a84c]/40 bg-[#1a1a1a] p-3 shadow-xl">
              <LeadCardContent lead={activeLead} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <LeadDetailSheet
        lead={selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
      />
    </div>
  );
}
