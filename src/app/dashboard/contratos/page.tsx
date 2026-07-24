"use client";

import { useState } from "react";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileCheck2, FileClock } from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { Lead } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { LeadDetailSheet } from "@/components/dashboard/LeadDetailSheet";

function ContratosView() {
  // /api/contratos já filtra por status (contrato_enviado/contrato_assinado)
  // — não usar useLeads() aqui, que só traz status=ativo e nunca inclui
  // leads que já geraram contrato.
  const { data, isLoading } = useSWR<Lead[]>(
    "/api/contratos",
    (endpoint: string) => apiFetch<Lead[]>(endpoint),
    { refreshInterval: 5000, onError: (err) => console.error("SWR error:", err) }
  );
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const contratos = Array.isArray(data) ? data : [];

  const enviados = contratos.length;
  const aguardando = contratos.filter((c) => c.status === "contrato_enviado").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#c9a84c]/10">
              <FileCheck2 className="h-5 w-5 text-[#c9a84c]" />
            </div>
            <div>
              <p className="text-sm text-white/50">Contratos enviados</p>
              <p className="text-2xl font-semibold text-white">{enviados}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
              <FileClock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-white/50">Aguardando assinatura</p>
              <p className="text-2xl font-semibold text-white">{aguardando}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">WhatsApp</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Origem</th>
              <th className="px-4 py-3 font-medium">Atualizado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="px-4 py-3" colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))}

            {!isLoading &&
              contratos.map((lead) => (
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
                  <td className="px-4 py-3">
                    <Badge variant={lead.status === "contrato_assinado" ? "indicacoes" : "muted"}>
                      {lead.status === "contrato_assinado"
                        ? "Assinado"
                        : "Aguardando assinatura"}
                    </Badge>
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

            {!isLoading && contratos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                  Nenhum contrato em andamento.
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

export default function ContratosPage() {
  return (
    <div className="p-6">
      <ErrorBoundary label="os contratos">
        <ContratosView />
      </ErrorBoundary>
    </div>
  );
}
