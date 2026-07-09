"use client";

import { useState } from "react";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { ESTAGIO_LABELS } from "@/lib/labels";
import type { LeadEstagio, PromptAline } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { cn } from "@/lib/utils";

function PromptEditor({
  prompt,
  readOnly,
  onSaved,
}: {
  prompt: PromptAline;
  readOnly: boolean;
  onSaved: (updated: PromptAline) => void;
}) {
  const [titulo, setTitulo] = useState(prompt.titulo);
  const [descricao, setDescricao] = useState(prompt.descricao ?? "");
  const [conteudo, setConteudo] = useState(prompt.conteudo);
  const [ativo, setAtivo] = useState(prompt.ativo);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/prompts/${prompt.estagio}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, descricao, conteudo, ativo }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Não foi possível salvar o prompt.");
        return;
      }

      onSaved(body as PromptAline);
      toast.success(
        body.sincronizado
          ? "Prompt salvo e sincronizado com a Aline."
          : "Prompt salvo, mas a sincronização automática com o n8n falhou. A Aline pode demorar a refletir a mudança."
      );
    } catch {
      toast.error("Erro de conexão ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="items-start gap-1 p-6">
        <CardTitle>{ESTAGIO_LABELS[prompt.estagio]}</CardTitle>
        <p className="text-sm text-white/50">
          Comportamento da Aline neste estágio do funil.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 p-6 pt-0">
        <div className="flex flex-col gap-2">
          <Label htmlFor="prompt-titulo">Título</Label>
          <Input
            id="prompt-titulo"
            value={titulo}
            disabled={readOnly}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="prompt-descricao">Descrição</Label>
          <Input
            id="prompt-descricao"
            value={descricao}
            disabled={readOnly}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Para que serve este estágio, opcional"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="prompt-conteudo">Prompt</Label>
            <span className="text-xs text-white/40">
              {conteudo.length.toLocaleString("pt-BR")} caracteres
            </span>
          </div>
          <textarea
            id="prompt-conteudo"
            value={conteudo}
            disabled={readOnly}
            onChange={(e) => setConteudo(e.target.value)}
            rows={18}
            spellCheck={false}
            className="w-full resize-y rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 font-mono text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Estágio ativo</p>
            <p className="text-xs text-white/40">
              Se desativado, a Aline ignora este prompt.
            </p>
          </div>
          <Switch checked={ativo} onCheckedChange={setAtivo} disabled={readOnly} />
        </div>

        {!readOnly && (
          <div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}

        {readOnly && (
          <p className="text-xs text-white/40">
            Seu perfil tem acesso somente para visualização dos prompts.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AlineView() {
  const { data: prompts, isLoading, mutate } = useSWR("/api/prompts", (endpoint: string) =>
    apiFetch<PromptAline[]>(endpoint)
  );
  const { user } = useSession();
  const readOnly = user?.perfil !== "admin";

  const [selectedEstagio, setSelectedEstagio] = useState<LeadEstagio | null>(null);
  const activeEstagio = selectedEstagio ?? prompts?.[0]?.estagio ?? null;
  const selected = prompts?.find((p) => p.estagio === activeEstagio) ?? null;

  const handleSaved = (updated: PromptAline) => {
    mutate(
      (current) =>
        current?.map((p) => (p.estagio === updated.estagio ? updated : p)),
      { revalidate: false }
    );
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="flex w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white/80">
            Estágios do funil
          </h2>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto">
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}

          {!isLoading &&
            prompts?.map((prompt) => {
              const isSelected = activeEstagio === prompt.estagio;
              return (
                <button
                  key={prompt.id}
                  onClick={() => setSelectedEstagio(prompt.estagio)}
                  className={cn(
                    "flex flex-col gap-1.5 border-b border-white/5 px-4 py-3 text-left transition-colors last:border-0 hover:bg-white/5",
                    isSelected && "bg-[#c9a84c]/10"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-white">
                      {ESTAGIO_LABELS[prompt.estagio]}
                    </p>
                    <Badge variant={prompt.ativo ? "indicacoes" : "muted"}>
                      {prompt.ativo ? "ativo" : "inativo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-white/40">
                    Atualizado{" "}
                    {formatDistanceToNow(new Date(prompt.atualizado_em), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </button>
              );
            })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#1a1a1a] p-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {!isLoading && selected && (
          <PromptEditor
            key={selected.id}
            prompt={selected}
            readOnly={readOnly}
            onSaved={handleSaved}
          />
        )}

        {!isLoading && !selected && (
          <div className="flex h-full items-center justify-center rounded-xl border border-white/10 bg-[#1a1a1a] text-sm text-white/40">
            Nenhum prompt encontrado.
          </div>
        )}
      </div>
    </div>
  );
}

export default function AlinePage() {
  return (
    <div className="p-6">
      <ErrorBoundary label="os prompts da Aline">
        <AlineView />
      </ErrorBoundary>
    </div>
  );
}
