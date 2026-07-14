"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDown, ArrowUp, ArrowUpDown, Bot, Clock, MessageSquare, User } from "lucide-react";

import { useDepartamentos, useEstagios } from "@/hooks/useDashboard";
import { ESTAGIO_LABELS } from "@/lib/labels";
import type { Lead, ModoAtendimento } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const PAGE_SIZE = 25;

const MODO_ICON: Record<ModoAtendimento, typeof Bot> = {
  ia: Bot,
  humano: User,
  pendente: Clock,
};

type SortKey = "nome" | "estagio" | "atualizado_em";
type SortDir = "asc" | "desc";

interface LeadsListViewProps {
  leads: Lead[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, checked: boolean) => void;
  onToggleSelectMany: (ids: string[], checked: boolean) => void;
  onOpenLead: (lead: Lead) => void;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 text-white/30" />;
  return dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
}

export function LeadsListView({
  leads,
  selectedIds,
  onToggleSelect,
  onToggleSelectMany,
  onOpenLead,
}: LeadsListViewProps) {
  const { departamentos } = useDepartamentos();
  const { estagios } = useEstagios();
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("atualizado_em");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const departamentoMap = new Map(departamentos.map((d) => [d.id, d]));
  const estagioLabel = useCallback(
    (slug: string) => estagios.find((e) => e.slug === slug)?.nome ?? ESTAGIO_LABELS[slug] ?? slug,
    [estagios]
  );
  const estagioCor = (slug: string) => estagios.find((e) => e.slug === slug)?.cor ?? "#6b7280";

  const sortedLeads = useMemo(() => {
    const copy = [...leads];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "nome") cmp = (a.nome || "").localeCompare(b.nome || "");
      else if (sortKey === "estagio") cmp = estagioLabel(a.estagio).localeCompare(estagioLabel(b.estagio));
      else cmp = new Date(a.atualizado_em).getTime() - new Date(b.atualizado_em).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [leads, sortKey, sortDir, estagioLabel]);

  const totalPages = Math.max(1, Math.ceil(sortedLeads.length / PAGE_SIZE));
  const pageLeads = sortedLeads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const idsPagina = pageLeads.map((l) => l.id);
  const todosSelecionados = idsPagina.length > 0 && idsPagina.every((id) => selectedIds.has(id));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
              <th className="w-10 px-4 py-3">
                <Checkbox
                  checked={todosSelecionados}
                  onCheckedChange={(checked) => onToggleSelectMany(idsPagina, checked)}
                />
              </th>
              <th className="px-4 py-3 font-medium">
                <button className="flex items-center gap-1" onClick={() => toggleSort("nome")}>
                  Nome <SortIcon active={sortKey === "nome"} dir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">
                <button className="flex items-center gap-1" onClick={() => toggleSort("estagio")}>
                  Estágio <SortIcon active={sortKey === "estagio"} dir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 font-medium">Departamento</th>
              <th className="px-4 py-3 font-medium">Instância</th>
              <th className="px-4 py-3 font-medium">
                <button className="flex items-center gap-1" onClick={() => toggleSort("atualizado_em")}>
                  Último contato <SortIcon active={sortKey === "atualizado_em"} dir={sortDir} />
                </button>
              </th>
              <th className="px-4 py-3 font-medium">Modo</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {pageLeads.map((lead) => {
              const dep = lead.departamento_id ? departamentoMap.get(lead.departamento_id) : undefined;
              const ModoIcon = MODO_ICON[lead.modo_atendimento] ?? Bot;
              return (
                <tr
                  key={lead.id}
                  onClick={() => onOpenLead(lead)}
                  className="cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-white/5"
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(lead.id)}
                      onCheckedChange={(checked) => onToggleSelect(lead.id, checked)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{lead.nome || "Sem nome"}</td>
                  <td className="px-4 py-3 text-white/60">{lead.numero_whatsapp}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: estagioCor(lead.estagio) }}
                    >
                      {estagioLabel(lead.estagio)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/60">{dep?.nome ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={lead.instancia === "ads" ? "ads" : "indicacoes"}>
                      {lead.instancia}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-white/40">
                    {formatDistanceToNow(new Date(lead.atualizado_em), { addSuffix: true, locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <ModoIcon className="h-4 w-4 text-white/50" />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => router.push(`/dashboard/conversas?lead=${lead.id}`)}
                      className="flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/5"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Abrir conversa
                    </button>
                  </td>
                </tr>
              );
            })}

            {pageLeads.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-white/40">
                  Nenhum lead encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-white/60">
          <span>
            Página {page} de {totalPages} · {sortedLeads.length} leads
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-white/10 px-3 py-1 disabled:opacity-30"
            >
              Anterior
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-md border border-white/10 px-3 py-1 disabled:opacity-30"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
