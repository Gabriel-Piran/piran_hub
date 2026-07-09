"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search } from "lucide-react";

import { useDepartamentos, useEstagios, useLeads } from "@/hooks/useDashboard";
import { ESTAGIO_LABELS } from "@/lib/labels";
import { LEAD_ESTAGIOS } from "@/types";
import type { Lead, LeadEstagio } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { LeadDetailSheet } from "@/components/dashboard/LeadDetailSheet";

type EstagioFilter = "TODOS" | LeadEstagio;

function LeadsTable() {
  const { leads, isLoading } = useLeads();
  const { departamentos } = useDepartamentos();
  const { estagios } = useEstagios();
  const [search, setSearch] = useState("");
  const [estagioFilter, setEstagioFilter] = useState<EstagioFilter>("TODOS");
  const [departamentoFilter, setDepartamentoFilter] = useState<string>("TODOS");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads
      .filter((lead) => estagioFilter === "TODOS" || lead.estagio === estagioFilter)
      .filter(
        (lead) =>
          departamentoFilter === "TODOS" || lead.departamento_id === departamentoFilter
      )
      .filter(
        (lead) =>
          term === "" ||
          String(lead.nome || "").toLowerCase().includes(term) ||
          String(lead.numero_whatsapp || "").toLowerCase().includes(term)
      )
      .sort(
        (a, b) =>
          new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime()
      );
  }, [leads, search, estagioFilter, departamentoFilter]);

  return (
    <div className="flex flex-col gap-4">
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

        <select
          value={estagioFilter}
          onChange={(e) => setEstagioFilter(e.target.value as EstagioFilter)}
          className="rounded-md border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
        >
          <option value="TODOS">Todos os estágios</option>
          {estagios.length > 0
            ? estagios.map((estagio) => (
                <option key={estagio.id} value={estagio.slug}>
                  {estagio.nome}
                </option>
              ))
            : LEAD_ESTAGIOS.map((estagio) => (
                <option key={estagio} value={estagio}>
                  {ESTAGIO_LABELS[estagio]}
                </option>
              ))}
        </select>

        <select
          value={departamentoFilter}
          onChange={(e) => setDepartamentoFilter(e.target.value)}
          className="rounded-md border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
        >
          <option value="TODOS">Todos os departamentos</option>
          {departamentos.map((dep) => (
            <option key={dep.id} value={dep.id}>
              {dep.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">WhatsApp</th>
              <th className="px-4 py-3 font-medium">Estágio</th>
              <th className="px-4 py-3 font-medium">Origem</th>
              <th className="px-4 py-3 font-medium">Atualizado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="px-4 py-3" colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))}

            {!isLoading &&
              filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className="cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-white/5"
                >
                  <td className="px-4 py-3 font-medium text-white">
                    {lead.nome}
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {lead.numero_whatsapp}
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {ESTAGIO_LABELS[lead.estagio]}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={lead.instancia === "ads" ? "ads" : "indicacoes"}
                    >
                      {lead.instancia}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-white/40">
                    {formatDistanceToNow(new Date(lead.atualizado_em), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </td>
                </tr>
              ))}

            {!isLoading && filteredLeads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                  Nenhum lead encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <LeadDetailSheet
        lead={selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
      />
    </div>
  );
}

export default function LeadsPage() {
  return (
    <div className="p-6">
      <ErrorBoundary label="a lista de leads">
        <LeadsTable />
      </ErrorBoundary>
    </div>
  );
}
