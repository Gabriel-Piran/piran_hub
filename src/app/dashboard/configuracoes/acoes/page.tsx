"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAcoes } from "@/hooks/useDashboard";
import type { Acao, AcaoTipo } from "@/types";
import { ACAO_TIPO_LABELS } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { cn } from "@/lib/utils";

const TIPOS: AcaoTipo[] = [
  "estagio",
  "status",
  "mensagem",
  "webhook",
  "transferir",
  "arquivar",
  "contrato",
];

const TIPO_BADGE_CLASS: Record<AcaoTipo, string> = {
  estagio: "border-sky-500/40 bg-sky-500/10 text-sky-400",
  status: "border-purple-500/40 bg-purple-500/10 text-purple-400",
  mensagem: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  webhook: "border-orange-500/40 bg-orange-500/10 text-orange-400",
  transferir: "border-[#c9a84c]/40 bg-[#c9a84c]/10 text-[#c9a84c]",
  arquivar: "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",
  contrato: "border-red-500/40 bg-red-500/10 text-red-400",
};

interface FormState {
  id?: string;
  nome: string;
  slug: string;
  descricao: string;
  tipo: AcaoTipo;
  configuracaoJson: string;
  webhookUrl: string;
}

const EMPTY_FORM: FormState = {
  nome: "",
  slug: "",
  descricao: "",
  tipo: "estagio",
  configuracaoJson: "{}",
  webhookUrl: "",
};

function AcoesView() {
  const { acoes, isLoading, mutate } = useAcoes();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(form.id);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (acao: Acao) => {
    setForm({
      id: acao.id,
      nome: acao.nome,
      slug: acao.slug,
      descricao: acao.descricao ?? "",
      tipo: acao.tipo,
      configuracaoJson: JSON.stringify(acao.configuracao ?? {}, null, 2),
      webhookUrl: typeof acao.configuracao?.url === "string" ? acao.configuracao.url : "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.slug.trim()) {
      toast.error("Informe nome e slug.");
      return;
    }

    let configuracao: Record<string, unknown> = {};
    if (form.tipo === "webhook") {
      if (!form.webhookUrl.trim()) {
        toast.error("Informe a URL do webhook.");
        return;
      }
      configuracao = { url: form.webhookUrl.trim() };
    } else {
      try {
        configuracao = form.configuracaoJson.trim() ? JSON.parse(form.configuracaoJson) : {};
      } catch {
        toast.error("Configuração inválida: o JSON não pôde ser interpretado.");
        return;
      }
    }

    const payload = {
      nome: form.nome.trim(),
      slug: form.slug.trim().replace(/^@+/, ""),
      descricao: form.descricao.trim() || null,
      tipo: form.tipo,
      configuracao,
    };

    setSaving(true);
    try {
      const res = form.id
        ? await fetch(`/api/acoes/${form.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/acoes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Não foi possível salvar a ação.");
        return;
      }

      toast.success(isEditing ? "Ação atualizada." : "Ação criada.");
      setModalOpen(false);
      await mutate();
    } catch {
      toast.error("Erro de conexão ao salvar a ação.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (acao: Acao) => {
    try {
      const res = await fetch(`/api/acoes/${acao.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !acao.ativo }),
      });
      if (!res.ok) throw new Error();
      await mutate();
    } catch {
      toast.error("Não foi possível atualizar o status.");
    }
  };

  const handleDelete = async (acao: Acao) => {
    if (!confirm(`Excluir a ação "${acao.nome}"?`)) return;

    try {
      const res = await fetch(`/api/acoes/${acao.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Não foi possível excluir a ação.");
        return;
      }
      toast.success("Ação excluída.");
      await mutate();
    } catch {
      toast.error("Erro de conexão ao excluir ação.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/80">Ações / Tools</h2>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" />
          Nova ação
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Ativo</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="px-4 py-3" colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))}

            {!isLoading &&
              acoes.map((acao) => (
                <tr key={acao.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-medium text-white">{acao.nome}</td>
                  <td className="px-4 py-3 text-[#c9a84c]">@{acao.slug}</td>
                  <td className="px-4 py-3">
                    <Badge className={cn("border", TIPO_BADGE_CLASS[acao.tipo])}>
                      {ACAO_TIPO_LABELS[acao.tipo]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-white/60 max-w-xs truncate">
                    {acao.descricao || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Switch checked={acao.ativo} onCheckedChange={() => handleToggleAtivo(acao)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(acao)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-white"
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(acao)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-red-400"
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            {!isLoading && acoes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                  Nenhuma ação cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar ação" : "Nova ação"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ac-nome">Nome</Label>
              <Input
                id="ac-nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ac-slug">Slug (atalho @)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/40">@</span>
                <Input
                  id="ac-slug"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      slug: e.target.value.replace(/^@+/, "").toLowerCase(),
                    }))
                  }
                  placeholder="transferir"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ac-descricao">Descrição</Label>
              <Input
                id="ac-descricao"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ac-tipo">Tipo</Label>
              <select
                id="ac-tipo"
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as AcaoTipo }))}
                className="rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
              >
                {TIPOS.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {ACAO_TIPO_LABELS[tipo]}
                  </option>
                ))}
              </select>
            </div>

            {form.tipo === "webhook" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="ac-webhook-url">URL do webhook</Label>
                <Input
                  id="ac-webhook-url"
                  value={form.webhookUrl}
                  onChange={(e) => setForm((f) => ({ ...f, webhookUrl: e.target.value }))}
                  placeholder="https://meusistema.com/webhook"
                />
                <p className="text-xs text-white/40">
                  Ao executar, envia POST com {"{lead_id, numero_whatsapp, estagio, status, nome, dados}"}.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Label htmlFor="ac-config">Configuração (JSON)</Label>
                <textarea
                  id="ac-config"
                  value={form.configuracaoJson}
                  onChange={(e) => setForm((f) => ({ ...f, configuracaoJson: e.target.value }))}
                  rows={5}
                  className="rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 font-mono text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="mt-2">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AcoesPage() {
  return (
    <div className="p-6">
      <ErrorBoundary label="as ações">
        <AcoesView />
      </ErrorBoundary>
    </div>
  );
}
