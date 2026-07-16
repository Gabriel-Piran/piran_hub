"use client";

import { useState } from "react";
import useSWR from "swr";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import { useAcoes, useEstagios } from "@/hooks/useDashboard";
import type { RegraCondicional } from "@/types";
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

interface FormState {
  id?: string;
  nome: string;
  estagio_gatilho: string;
  palavras_chave: string[];
  acao_id: string;
  prioridade: string;
}

const EMPTY_FORM: FormState = {
  nome: "",
  estagio_gatilho: "",
  palavras_chave: [],
  acao_id: "",
  prioridade: "0",
};

function useRegrasCondicionais() {
  const { data, isLoading, mutate } = useSWR(
    "/api/regras-condicionais",
    (endpoint: string) => apiFetch<RegraCondicional[]>(endpoint),
    { onError: (err) => console.error("SWR error:", err) }
  );

  return { regras: Array.isArray(data) ? data : [], isLoading, mutate };
}

function RegrasView() {
  const { regras, isLoading, mutate } = useRegrasCondicionais();
  const { estagios } = useEstagios();
  const { acoes } = useAcoes();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [novaPalavra, setNovaPalavra] = useState("");
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(form.id);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setNovaPalavra("");
    setModalOpen(true);
  };

  const openEdit = (regra: RegraCondicional) => {
    setForm({
      id: regra.id,
      nome: regra.nome,
      estagio_gatilho: regra.estagio_gatilho ?? "",
      palavras_chave: regra.palavras_chave ?? [],
      acao_id: regra.acao_id ?? "",
      prioridade: String(regra.prioridade ?? 0),
    });
    setNovaPalavra("");
    setModalOpen(true);
  };

  const adicionarPalavra = () => {
    const palavra = novaPalavra.trim().toLowerCase();
    if (!palavra || form.palavras_chave.includes(palavra)) {
      setNovaPalavra("");
      return;
    }
    setForm((f) => ({ ...f, palavras_chave: [...f.palavras_chave, palavra] }));
    setNovaPalavra("");
  };

  const removerPalavra = (palavra: string) => {
    setForm((f) => ({
      ...f,
      palavras_chave: f.palavras_chave.filter((p) => p !== palavra),
    }));
  };

  const handleSave = async () => {
    if (!form.nome.trim() || form.palavras_chave.length === 0 || !form.acao_id) {
      toast.error("Informe nome, ao menos uma palavra-chave e a ação.");
      return;
    }

    const payload = {
      nome: form.nome.trim(),
      estagio_gatilho: form.estagio_gatilho || null,
      palavras_chave: form.palavras_chave,
      acao_id: form.acao_id,
      prioridade: Number(form.prioridade) || 0,
    };

    setSaving(true);
    try {
      const res = form.id
        ? await fetch(`/api/regras-condicionais/${form.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/regras-condicionais", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Não foi possível salvar a regra.");
        return;
      }

      toast.success(isEditing ? "Regra atualizada." : "Regra criada.");
      setModalOpen(false);
      await mutate();
    } catch {
      toast.error("Erro de conexão ao salvar regra.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (regra: RegraCondicional) => {
    try {
      const res = await fetch(`/api/regras-condicionais/${regra.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !regra.ativo }),
      });
      if (!res.ok) throw new Error();
      await mutate();
    } catch {
      toast.error("Não foi possível atualizar o status.");
    }
  };

  const handleDelete = async (regra: RegraCondicional) => {
    if (!confirm(`Excluir a regra "${regra.nome}"?`)) return;

    try {
      const res = await fetch(`/api/regras-condicionais/${regra.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Não foi possível excluir a regra.");
        return;
      }
      toast.success("Regra excluída.");
      await mutate();
    } catch {
      toast.error("Erro de conexão ao excluir regra.");
    }
  };

  const estagioNome = (slug: string | null) =>
    slug ? (estagios.find((e) => e.slug === slug)?.nome ?? slug) : "Qualquer estágio";
  const acaoNome = (id: string | null) => acoes.find((a) => a.id === id)?.nome ?? "—";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/80">Regras condicionais</h2>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" />
          Nova regra
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Estágio gatilho</th>
              <th className="px-4 py-3 font-medium">Palavras-chave</th>
              <th className="px-4 py-3 font-medium">Ação</th>
              <th className="px-4 py-3 font-medium">Prioridade</th>
              <th className="px-4 py-3 font-medium">Ativo</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="px-4 py-3" colSpan={7}>
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))}

            {!isLoading &&
              regras.map((regra) => (
                <tr key={regra.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-medium text-white">{regra.nome}</td>
                  <td className="px-4 py-3">
                    <Badge variant="muted">{estagioNome(regra.estagio_gatilho)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {(regra.palavras_chave ?? []).map((p) => (
                        <Badge key={p} variant="muted" className="text-[10px]">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/60">{acaoNome(regra.acao_id)}</td>
                  <td className="px-4 py-3 text-white/60">{regra.prioridade}</td>
                  <td className="px-4 py-3">
                    <Switch checked={regra.ativo} onCheckedChange={() => handleToggleAtivo(regra)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(regra)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-white"
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(regra)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-red-400"
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            {!isLoading && regras.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                  Nenhuma regra condicional cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar regra" : "Nova regra condicional"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rg-nome">Nome</Label>
              <Input
                id="rg-nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="rg-estagio">Estágio gatilho</Label>
              <select
                id="rg-estagio"
                value={form.estagio_gatilho}
                onChange={(e) => setForm((f) => ({ ...f, estagio_gatilho: e.target.value }))}
                className="rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
              >
                <option value="">Qualquer estágio</option>
                {estagios.map((estagio) => (
                  <option key={estagio.id} value={estagio.slug}>
                    {estagio.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="rg-palavra">Palavras-chave</Label>
              <Input
                id="rg-palavra"
                value={novaPalavra}
                onChange={(e) => setNovaPalavra(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    adicionarPalavra();
                  }
                }}
                placeholder="Digite e pressione Enter"
              />
              <div className="flex flex-wrap gap-2 mt-1">
                {form.palavras_chave.map((palavra) => (
                  <span
                    key={palavra}
                    className="flex items-center gap-1 rounded-full border border-[#c9a84c]/40 bg-[#c9a84c]/10 px-2 py-1 text-xs text-[#c9a84c]"
                  >
                    {palavra}
                    <button onClick={() => removerPalavra(palavra)} aria-label={`Remover ${palavra}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="rg-acao">Ação a executar</Label>
              <select
                id="rg-acao"
                value={form.acao_id}
                onChange={(e) => setForm((f) => ({ ...f, acao_id: e.target.value }))}
                className="rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
              >
                <option value="">Selecione...</option>
                {acoes.map((acao) => (
                  <option key={acao.id} value={acao.id}>
                    {acao.nome} (@{acao.slug})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="rg-prioridade">Prioridade</Label>
              <Input
                id="rg-prioridade"
                type="number"
                value={form.prioridade}
                onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value }))}
              />
              <p className="text-xs text-white/40">
                Regras com prioridade maior são verificadas primeiro.
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="mt-2">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RegrasCondicionaisPage() {
  return (
    <div className="p-6">
      <ErrorBoundary label="as regras condicionais">
        <RegrasView />
      </ErrorBoundary>
    </div>
  );
}
