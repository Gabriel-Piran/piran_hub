"use client";

import Link from "next/link";
import useSWR from "swr";
import { ArrowRight, GitBranch } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { useAcoes, useEstagios } from "@/hooks/useDashboard";
import type { Acao, RegraCondicional } from "@/types";
import { ACAO_TIPO_LABELS } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";

function useRegrasCondicionais() {
  const { data, isLoading } = useSWR(
    "/api/regras-condicionais",
    (endpoint: string) => apiFetch<RegraCondicional[]>(endpoint),
    { onError: (err) => console.error("SWR error:", err) }
  );

  return { regras: Array.isArray(data) ? data : [], isLoading };
}

function ArvoreView() {
  const { estagios, isLoading: estagiosLoading } = useEstagios();
  const { acoes, isLoading: acoesLoading } = useAcoes();
  const { regras, isLoading: regrasLoading } = useRegrasCondicionais();

  const isLoading = estagiosLoading || acoesLoading || regrasLoading;

  const estagioNome = (slug: string | null) =>
    slug ? (estagios.find((e) => e.slug === slug)?.nome ?? slug) : "Qualquer estágio";

  const grupos: { slug: string | null; nome: string }[] = [
    { slug: null, nome: "Qualquer estágio" },
    ...[...estagios].sort((a, b) => a.ordem - b.ordem).map((e) => ({ slug: e.slug, nome: e.nome })),
  ];

  const destinoLabel = (acao: Acao) => {
    const config = acao.configuracao ?? {};
    if (acao.tipo === "estagio" && typeof config.estagio === "string") {
      return { texto: estagioNome(config.estagio), destaque: true };
    }
    if (acao.tipo === "status" && typeof config.status === "string") {
      return { texto: `status: ${config.status}`, destaque: false };
    }
    return { texto: ACAO_TIPO_LABELS[acao.tipo], destaque: false };
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white/80">
          <GitBranch className="h-4 w-4 text-[#c9a84c]" />
          Árvore de decisão
        </h2>
        <p className="mt-1 text-xs text-white/40">
          Para cada estágio do funil, mostra quais gatilhos (palavras-chave das regras condicionais ou comandos
          @ digitados direto na conversa) disparam quais ações — e para onde o lead vai em seguida.
        </p>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="flex flex-col gap-4">
          {grupos.map((grupo) => {
            const regrasDoGrupo = regras.filter((r) => (r.estagio_gatilho ?? null) === grupo.slug);
            if (regrasDoGrupo.length === 0) return null;

            return (
              <div key={grupo.slug ?? "qualquer"} className="rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
                <Badge variant="muted" className="mb-3">
                  {grupo.nome}
                </Badge>

                <div className="flex flex-col gap-2">
                  {regrasDoGrupo.map((regra) => {
                    const acao = acoes.find((a) => a.id === regra.acao_id);
                    if (!acao) return null;
                    const destino = destinoLabel(acao);

                    return (
                      <div
                        key={regra.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-[#0f0f0f] px-3 py-2 text-xs"
                      >
                        <div className="flex flex-wrap gap-1">
                          {regra.palavras_chave.map((p) => (
                            <Badge key={p} variant="muted" className="text-[10px]">
                              {p}
                            </Badge>
                          ))}
                        </div>
                        <ArrowRight className="h-3 w-3 shrink-0 text-white/30" />
                        <span className="font-medium text-white">{acao.nome}</span>
                        <span className="text-white/30">(@{acao.slug})</span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-white/30" />
                        <Badge variant={destino.destaque ? "ads" : "muted"}>{destino.texto}</Badge>
                        {!regra.ativo && (
                          <Badge variant="muted" className="text-red-400">
                            inativa
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
            <Badge variant="muted" className="mb-3">
              Comandos diretos (@)
            </Badge>
            <p className="mb-3 text-xs text-white/40">
              Digitados direto na conversa do WhatsApp (ex: <span className="text-[#c9a84c]">@transferir</span>),
              disparam a ação na hora, em qualquer estágio — sem precisar de palavra-chave cadastrada.
            </p>
            <div className="flex flex-col gap-2">
              {acoes.map((acao) => {
                const destino = destinoLabel(acao);
                return (
                  <div
                    key={acao.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-[#0f0f0f] px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-[#c9a84c]">@{acao.slug}</span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-white/30" />
                    <span className="text-white">{acao.nome}</span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-white/30" />
                    <Badge variant={destino.destaque ? "ads" : "muted"}>{destino.texto}</Badge>
                    {!acao.ativo && (
                      <Badge variant="muted" className="text-red-400">
                        inativa
                      </Badge>
                    )}
                  </div>
                );
              })}
              {acoes.length === 0 && <p className="text-xs text-white/40">Nenhuma ação cadastrada.</p>}
            </div>
          </div>

          {regras.length === 0 && (
            <p className="text-xs text-white/40">Nenhuma regra condicional cadastrada ainda.</p>
          )}
        </div>
      )}

      <div className="flex gap-4 text-xs text-white/40">
        <Link href="/dashboard/configuracoes/acoes" className="underline hover:text-white">
          Editar ações
        </Link>
        <Link href="/dashboard/configuracoes/regras" className="underline hover:text-white">
          Editar regras condicionais
        </Link>
      </div>
    </div>
  );
}

export default function ArvoreDecisaoPage() {
  return (
    <div className="p-6">
      <ErrorBoundary label="a árvore de decisão">
        <ArvoreView />
      </ErrorBoundary>
    </div>
  );
}
