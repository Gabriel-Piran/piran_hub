"use client";

import { Suspense, useMemo, useState } from "react";
import { LayoutGrid, List, Search } from "lucide-react";
import useSWR from "swr";

import { apiFetch } from "@/lib/api";
import { mockLeads } from "@/lib/mock-data";
import { useLeadsFiltros } from "@/hooks/useLeadsFiltros";
import type { Lead } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { LeadDetailSheet } from "@/components/dashboard/LeadDetailSheet";
import { FiltrosButton, FiltrosPanel } from "@/components/dashboard/FiltrosPanel";
import { BulkActionBar } from "@/components/dashboard/BulkActionBar";
import { LeadsKanban } from "@/components/dashboard/LeadsKanban";
import { LeadsListView } from "@/components/dashboard/LeadsListView";

type ViewMode = "kanban" | "lista";

function LeadsPageContent() {
  const { filtros, aplicarFiltros, limparFiltros, totalAtivos, queryString } =
    useLeadsFiltros("leads");
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "lista";
    const saved = window.localStorage.getItem("piran_hub_leads_view");
    return saved === "kanban" || saved === "lista" ? saved : "lista";
  });

  const setViewPersist = (v: ViewMode) => {
    setView(v);
    if (typeof window !== "undefined") window.localStorage.setItem("piran_hub_leads_view", v);
  };

  const endpoint = `/api/leads${queryString ? `?${queryString}` : "?status=ativo"}`;
  const { data, isLoading, mutate } = useSWR<Lead[]>(
    endpoint,
    (url: string) => apiFetch<Lead[]>(url).catch(() => mockLeads),
    { refreshInterval: 30_000, onError: (err) => console.error("SWR error:", err) }
  );
  const filteredLeads = useMemo(() => {
    const leads = Array.isArray(data) ? data : [];
    const term = search.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter(
      (lead) =>
        String(lead.nome || "").toLowerCase().includes(term) ||
        String(lead.numero_whatsapp || "").toLowerCase().includes(term)
    );
  }, [data, search]);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectMany = (ids: string[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <BulkActionBar
        selectedIds={Array.from(selectedIds)}
        onClear={() => setSelectedIds(new Set())}
        onDone={() => {
          setSelectedIds(new Set());
          mutate();
        }}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-white/10 bg-[#1a1a1a] px-3 py-2 sm:max-w-xs">
          <Search className="h-4 w-4 shrink-0 text-white/40" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
        </div>

        <FiltrosButton totalAtivos={totalAtivos} onClick={() => setFiltrosOpen(true)} />

        <div className="ml-auto flex items-center gap-1 rounded-md border border-white/10 bg-[#1a1a1a] p-1">
          <button
            onClick={() => setViewPersist("kanban")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "kanban" ? "bg-[#c9a84c] text-[#0f0f0f]" : "text-white/60 hover:text-white"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Kanban
          </button>
          <button
            onClick={() => setViewPersist("lista")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "lista" ? "bg-[#c9a84c] text-[#0f0f0f]" : "text-white/60 hover:text-white"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Lista
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!isLoading && view === "kanban" && (
        <LeadsKanban
          leads={filteredLeads}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectMany={toggleSelectMany}
          onOpenLead={setSelectedLead}
          onMutate={() => mutate()}
        />
      )}

      {!isLoading && view === "lista" && (
        <LeadsListView
          leads={filteredLeads}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectMany={toggleSelectMany}
          onOpenLead={setSelectedLead}
        />
      )}

      <LeadDetailSheet
        lead={selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
      />

      <FiltrosPanel
        open={filtrosOpen}
        onOpenChange={setFiltrosOpen}
        filtros={filtros}
        onAplicar={aplicarFiltros}
        onLimpar={limparFiltros}
      />
    </div>
  );
}

export default function LeadsPage() {
  return (
    <ErrorBoundary label="a lista de leads">
      <Suspense fallback={<div className="p-6"><Skeleton className="h-12 w-full" /></div>}>
        <LeadsPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}
