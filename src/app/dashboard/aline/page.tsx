"use client";

import { useState } from "react";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { ESTAGIO_LABELS } from "@/lib/labels";
import type { LeadEstagio, PromptAline, PromptAlineHistorico } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { cn } from "@/lib/utils";

const VARIAVEIS_PROMPT: { nome: string; descricao: string }[] = [
  { nome: "nome", descricao: "Nome do lead" },
  { nome: "numero_whatsapp", descricao: "Número de WhatsApp do lead" },
  { nome: "salario", descricao: "Salário informado na qualificação" },
  { nome: "tempo_trabalho", descricao: "Tempo de trabalho informado" },
  { nome: "data_saida", descricao: "Data de saída do emprego anterior" },
  { nome: "cpf", descricao: "CPF coletado" },
  { nome: "data_nascimento", descricao: "Data de nascimento coletada" },
  { nome: "nome_mae", descricao: "Nome da mãe coletado" },
  { nome: "logradouro, numero_end, bairro, cidade, estado, cep", descricao: "Campos de endereço coletados" },
];

function VariaveisDisponiveis() {
  return (
    <details className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
      <summary className="cursor-pointer select-none font-medium text-white/80">
        Variáveis disponíveis para usar no prompt
      </summary>
      <div className="mt-2 flex flex-col gap-1.5">
        <p className="text-xs text-white/40">
          Referência dos dados do lead que a Aline tem disponíveis nesta etapa. A
          sintaxe exata do placeholder (ex.: <code>{"{{nome}}"}</code>) depende de
          como o workflow da Aline no n8n está configurado — confirme lá antes de
          usar um nome novo.
        </p>
        <ul className="mt-1 flex flex-col gap-1 text-xs">
          {VARIAVEIS_PROMPT.map((v) => (
            <li key={v.nome} className="flex flex-wrap items-baseline gap-2">
              <code className="rounded bg-black/30 px-1.5 py-0.5 text-[#c9a84c]">{v.nome}</code>
              <span className="text-white/50">{v.descricao}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function HistoricoDialog({
  estagio,
  open,
  onOpenChange,
  onRestaurar,
}: {
  estagio: LeadEstagio;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestaurar: (versao: PromptAlineHistorico) => void;
}) {
  const { data, isLoading } = useSWR(
    open ? `/api/prompts/${estagio}/historico` : null,
    (endpoint: string) => apiFetch<PromptAlineHistorico[]>(endpoint)
  );
  const versoes = Array.isArray(data) ? data : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de versões — {ESTAGIO_LABELS[estagio]}</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-white/40">Carregando...</p>}

        {!isLoading && versoes.length === 0 && (
          <p className="text-sm text-white/40">
            Nenhuma versão anterior salva ainda — o histórico começa a partir do
            próximo Salvar.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {versoes.map((v) => (
            <div key={v.id} className="rounded-md border border-white/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-white/40">
                  {formatDistanceToNow(new Date(v.criado_em), { addSuffix: true, locale: ptBR })}
                  {v.editado_por ? ` · ${v.editado_por}` : ""}
                </div>
                <Button variant="ghost" size="sm" onClick={() => onRestaurar(v)}>
                  Restaurar esta versão
                </Button>
              </div>
              <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono text-xs text-white/60">
                {v.conteudo || "(vazio)"}
              </pre>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  const [historicoOpen, setHistoricoOpen] = useState(false);

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
      <CardHeader className="flex-row items-start justify-between gap-1 p-6">
        <div>
          <CardTitle>{ESTAGIO_LABELS[prompt.estagio]}</CardTitle>
          <p className="text-sm text-white/50">
            Comportamento da Aline neste estágio do funil.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setHistoricoOpen(true)}>
          Histórico
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 p-6 pt-0">
        <VariaveisDisponiveis />

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

      <HistoricoDialog
        estagio={prompt.estagio}
        open={historicoOpen}
        onOpenChange={setHistoricoOpen}
        onRestaurar={(versao) => {
          setTitulo(versao.titulo);
          setDescricao(versao.descricao ?? "");
          setConteudo(versao.conteudo);
          setAtivo(versao.ativo);
          setHistoricoOpen(false);
          toast.info("Versão carregada no editor — clique em Salvar para aplicar.");
        }}
      />
    </Card>
  );
}

function AlineView() {
  const { data: rawPrompts, isLoading, mutate } = useSWR(
    "/api/prompts",
    (endpoint: string) => apiFetch<PromptAline[]>(endpoint),
    { onError: (err) => console.error("SWR error:", err) }
  );
  const prompts = Array.isArray(rawPrompts) ? rawPrompts : [];
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
