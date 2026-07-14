"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useDepartamentos, useEstagios } from "@/hooks/useDashboard";
import { ESTAGIO_LABELS } from "@/lib/labels";
import { LEAD_ESTAGIOS } from "@/types";
import type { Lead } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadCard } from "@/components/dashboard/LeadCard";

interface LeadsKanbanProps {
  leads: Lead[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, checked: boolean) => void;
  onToggleSelectMany: (ids: string[], checked: boolean) => void;
  onOpenLead: (lead: Lead) => void;
  onMutate: () => void;
}

export function LeadsKanban({
  leads,
  selectedIds,
  onToggleSelect,
  onToggleSelectMany,
  onOpenLead,
  onMutate,
}: LeadsKanbanProps) {
  const { estagios } = useEstagios();
  const { departamentos } = useDepartamentos();
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const colunas =
    estagios.length > 0
      ? estagios.map((e) => ({ slug: e.slug, nome: e.nome, cor: e.cor }))
      : LEAD_ESTAGIOS.map((e) => ({ slug: e, nome: ESTAGIO_LABELS[e], cor: "#6b7280" }));

  const departamentoMap = new Map(departamentos.map((d) => [d.id, d]));

  const moverLead = async (leadId: string, novoEstagio: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.estagio === novoEstagio) return;

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estagio: novoEstagio }),
      });
      if (!res.ok) throw new Error();
      onMutate();
    } catch {
      toast.error("Não foi possível mover o lead.");
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {colunas.map((coluna) => {
        const leadsColuna = leads.filter((l) => (l.estagio || "RECEPCAO") === coluna.slug);
        const idsColuna = leadsColuna.map((l) => l.id);
        const todosSelecionados =
          idsColuna.length > 0 && idsColuna.every((id) => selectedIds.has(id));

        return (
          <div
            key={coluna.slug}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverColumn(coluna.slug);
            }}
            onDragLeave={() => setDragOverColumn((c) => (c === coluna.slug ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverColumn(null);
              const leadId = e.dataTransfer.getData("text/lead-id");
              if (leadId) moverLead(leadId, coluna.slug);
            }}
            className={`flex w-72 shrink-0 flex-col gap-3 rounded-xl border p-3 transition-colors ${
              dragOverColumn === coluna.slug
                ? "border-[#c9a84c]/50 bg-[#c9a84c]/5"
                : "border-white/10 bg-[#1a1a1a]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Checkbox
                checked={todosSelecionados}
                onCheckedChange={(checked) => onToggleSelectMany(idsColuna, checked)}
              />
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: coluna.cor }} />
              <span className="flex-1 truncate text-sm font-medium text-white">{coluna.nome}</span>
              <span className="text-xs text-white/40">{leadsColuna.length}</span>
            </div>

            <div className="flex flex-col gap-2">
              {leadsColuna.map((lead) => {
                const dep = lead.departamento_id ? departamentoMap.get(lead.departamento_id) : undefined;
                return (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    departamentoNome={dep?.nome}
                    departamentoCor={dep?.cor}
                    selected={selectedIds.has(lead.id)}
                    onToggleSelect={(checked) => onToggleSelect(lead.id, checked)}
                    onClick={() => onOpenLead(lead)}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/lead-id", lead.id)}
                  />
                );
              })}
              {leadsColuna.length === 0 && (
                <p className="py-4 text-center text-xs text-white/30">Nenhum lead</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
