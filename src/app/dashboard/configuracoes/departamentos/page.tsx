"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useDepartamentos } from "@/hooks/useDashboard";
import type { Departamento } from "@/types";
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
  descricao: string;
  cor: string;
}

const EMPTY_FORM: FormState = { nome: "", descricao: "", cor: "#c9a84c" };

function DepartamentosView() {
  const { departamentos, isLoading, mutate } = useDepartamentos();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(form.id);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (dep: Departamento) => {
    setForm({ id: dep.id, nome: dep.nome, descricao: dep.descricao ?? "", cor: dep.cor });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do departamento.");
      return;
    }

    setSaving(true);
    try {
      const res = isEditing
        ? await fetch(`/api/departamentos/${form.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: form.nome, descricao: form.descricao, cor: form.cor }),
          })
        : await fetch("/api/departamentos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: form.nome, descricao: form.descricao, cor: form.cor }),
          });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Não foi possível salvar o departamento.");
        return;
      }

      toast.success(isEditing ? "Departamento atualizado." : "Departamento criado.");
      setModalOpen(false);
      await mutate();
    } catch {
      toast.error("Erro de conexão ao salvar departamento.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (dep: Departamento) => {
    try {
      const res = await fetch(`/api/departamentos/${dep.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !dep.ativo }),
      });
      if (!res.ok) throw new Error();
      await mutate();
    } catch {
      toast.error("Não foi possível atualizar o status.");
    }
  };

  const handleDelete = async (dep: Departamento) => {
    if (!confirm(`Excluir o departamento ${dep.nome}?`)) return;

    try {
      const res = await fetch(`/api/departamentos/${dep.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Não foi possível excluir o departamento.");
        return;
      }
      toast.success("Departamento excluído.");
      await mutate();
    } catch {
      toast.error("Erro de conexão ao excluir departamento.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/80">Departamentos</h2>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" />
          Novo departamento
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Ativo</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="px-4 py-3" colSpan={4}>
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))}

            {!isLoading &&
              departamentos.map((dep) => (
                <tr key={dep.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <Badge
                      style={{
                        borderColor: `${dep.cor}66`,
                        backgroundColor: `${dep.cor}1a`,
                        color: dep.cor,
                      }}
                    >
                      {dep.nome}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-white/60">{dep.descricao ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Switch checked={dep.ativo} onCheckedChange={() => handleToggleAtivo(dep)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(dep)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-white"
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(dep)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-red-400"
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            {!isLoading && departamentos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-white/40">
                  Nenhum departamento cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar departamento" : "Novo departamento"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dep-nome">Nome</Label>
              <Input
                id="dep-nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dep-descricao">Descrição</Label>
              <Input
                id="dep-descricao"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dep-cor">Cor</Label>
              <input
                id="dep-cor"
                type="color"
                value={form.cor}
                onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))}
                className="h-10 w-16 cursor-pointer rounded-md border border-white/10 bg-[#0f0f0f]"
              />
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

export default function DepartamentosPage() {
  return (
    <div className="p-6">
      <ErrorBoundary label="os departamentos">
        <DepartamentosView />
      </ErrorBoundary>
    </div>
  );
}
