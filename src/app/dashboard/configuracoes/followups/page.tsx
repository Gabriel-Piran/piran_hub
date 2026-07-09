"use client";

import { useState } from "react";
import useSWR from "swr";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import { useEstagios, useMensagensRapidas } from "@/hooks/useDashboard";
import type { FollowupRegra } from "@/types";
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
  dias_espera: string;
  hora_envio: string;
  mensagem_rapida_id: string;
  mensagem_texto: string;
}

const EMPTY_FORM: FormState = {
  nome: "",
  estagio_gatilho: "",
  dias_espera: "1",
  hora_envio: "09:00",
  mensagem_rapida_id: "",
  mensagem_texto: "",
};

function useFollowupRegras() {
  const { data, isLoading, mutate } = useSWR("/api/followup-regras", (endpoint: string) =>
    apiFetch<FollowupRegra[]>(endpoint)
  );

  return { regras: data ?? [], isLoading, mutate };
}

function FollowupsView() {
  const { regras, isLoading, mutate } = useFollowupRegras();
  const { estagios } = useEstagios();
  const { mensagensRapidas } = useMensagensRapidas();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(form.id);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (regra: FollowupRegra) => {
    setForm({
      id: regra.id,
      nome: regra.nome,
      estagio_gatilho: regra.estagio_gatilho,
      dias_espera: String(regra.dias_espera),
      hora_envio: regra.hora_envio?.slice(0, 5) ?? "09:00",
      mensagem_rapida_id: regra.mensagem_rapida_id ?? "",
      mensagem_texto: regra.mensagem_texto ?? "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.estagio_gatilho) {
      toast.error("Informe nome e estágio gatilho.");
      return;
    }
    if (!form.mensagem_rapida_id && !form.mensagem_texto.trim()) {
      toast.error("Selecione uma mensagem rápida ou digite um texto livre.");
      return;
    }

    const payload = {
      nome: form.nome,
      estagio_gatilho: form.estagio_gatilho,
      dias_espera: Number(form.dias_espera),
      hora_envio: form.hora_envio,
      mensagem_rapida_id: form.mensagem_rapida_id || null,
      mensagem_texto: form.mensagem_rapida_id ? null : form.mensagem_texto,
    };

    setSaving(true);
    try {
      const res = isEditing
        ? await fetch(`/api/followup-regras/${form.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/followup-regras", {
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

  const handleToggleAtivo = async (regra: FollowupRegra) => {
    try {
      const res = await fetch(`/api/followup-regras/${regra.id}`, {
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

  const handleDelete = async (regra: FollowupRegra) => {
    if (!confirm(`Excluir a regra "${regra.nome}"?`)) return;

    try {
      const res = await fetch(`/api/followup-regras/${regra.id}`, { method: "DELETE" });
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

  const estagioNome = (slug: string) => estagios.find((e) => e.slug === slug)?.nome ?? slug;
  const mensagemNome = (regra: FollowupRegra) =>
    regra.mensagem_rapida_id
      ? (mensagensRapidas.find((m) => m.id === regra.mensagem_rapida_id)?.titulo ?? "—")
      : (regra.mensagem_texto ?? "—");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/80">Regras de follow-up</h2>
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
              <th className="px-4 py-3 font-medium">Dias</th>
              <th className="px-4 py-3 font-medium">Hora</th>
              <th className="px-4 py-3 font-medium">Mensagem</th>
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
                  <td className="px-4 py-3 text-white/60">{regra.dias_espera}d</td>
                  <td className="px-4 py-3 text-white/60">
                    {regra.hora_envio?.slice(0, 5)}
                  </td>
                  <td className="px-4 py-3 text-white/60">{mensagemNome(regra)}</td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={regra.ativo}
                      onCheckedChange={() => handleToggleAtivo(regra)}
                    />
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
                  Nenhuma regra de follow-up cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar regra" : "Nova regra de follow-up"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="fu-nome">Nome</Label>
              <Input
                id="fu-nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="fu-estagio">Estágio gatilho</Label>
              <select
                id="fu-estagio"
                value={form.estagio_gatilho}
                onChange={(e) => setForm((f) => ({ ...f, estagio_gatilho: e.target.value }))}
                className="rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
              >
                <option value="">Selecione...</option>
                {estagios.map((estagio) => (
                  <option key={estagio.id} value={estagio.slug}>
                    {estagio.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="fu-dias">Dias de espera</Label>
                <Input
                  id="fu-dias"
                  type="number"
                  min={0}
                  value={form.dias_espera}
                  onChange={(e) => setForm((f) => ({ ...f, dias_espera: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="fu-hora">Hora de envio</Label>
                <Input
                  id="fu-hora"
                  type="time"
                  value={form.hora_envio}
                  onChange={(e) => setForm((f) => ({ ...f, hora_envio: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="fu-mensagem-rapida">Mensagem rápida</Label>
              <select
                id="fu-mensagem-rapida"
                value={form.mensagem_rapida_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, mensagem_rapida_id: e.target.value }))
                }
                className="rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
              >
                <option value="">Usar texto livre abaixo</option>
                {mensagensRapidas.map((msg) => (
                  <option key={msg.id} value={msg.id}>
                    {msg.titulo}
                  </option>
                ))}
              </select>
            </div>

            {!form.mensagem_rapida_id && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="fu-texto">Texto livre</Label>
                <textarea
                  id="fu-texto"
                  value={form.mensagem_texto}
                  onChange={(e) => setForm((f) => ({ ...f, mensagem_texto: e.target.value }))}
                  rows={3}
                  className="rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
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

export default function FollowupsPage() {
  return (
    <div className="p-6">
      <ErrorBoundary label="os follow-ups">
        <FollowupsView />
      </ErrorBoundary>
    </div>
  );
}
