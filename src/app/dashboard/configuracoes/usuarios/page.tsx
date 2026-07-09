"use client";

import { useState } from "react";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import { useDepartamentos } from "@/hooks/useDashboard";
import { PERFIL_LABELS } from "@/types";
import type { Perfil, Usuario } from "@/types";
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

const PERFIL_OPTIONS: Perfil[] = ["admin", "advogado", "secretaria", "estagio"];

interface FormState {
  id?: string;
  nome: string;
  email: string;
  senha: string;
  perfil: Perfil;
  departamentoIds: string[];
}

const EMPTY_FORM: FormState = {
  nome: "",
  email: "",
  senha: "",
  perfil: "advogado",
  departamentoIds: [],
};

function UsuariosView() {
  const { data: rawUsuarios, isLoading, mutate } = useSWR(
    "/api/usuarios",
    (endpoint) => apiFetch<Usuario[]>(endpoint),
    { onError: (err) => console.error("SWR error:", err) }
  );
  const usuarios = Array.isArray(rawUsuarios) ? rawUsuarios : [];
  const { departamentos } = useDepartamentos();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [resetTarget, setResetTarget] = useState<Usuario | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [resetting, setResetting] = useState(false);

  const isEditing = Boolean(form.id);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (usuario: Usuario) => {
    setForm({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      senha: "",
      perfil: usuario.perfil,
      departamentoIds: usuario.departamento_ids ?? [],
    });
    setModalOpen(true);
  };

  const toggleDepartamento = (id: string) => {
    setForm((f) => ({
      ...f,
      departamentoIds: f.departamentoIds.includes(id)
        ? f.departamentoIds.filter((d) => d !== id)
        : [...f.departamentoIds, id],
    }));
  };

  const syncDepartamentos = async (usuarioId: string, novosIds: string[]) => {
    const original = usuarios?.find((u) => u.id === usuarioId)?.departamento_ids ?? [];
    const paraAdicionar = novosIds.filter((id) => !original.includes(id));
    const paraRemover = original.filter((id) => !novosIds.includes(id));

    await Promise.all([
      ...paraAdicionar.map((departamentoId) =>
        fetch(`/api/departamentos/${departamentoId}/usuarios`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario_id: usuarioId }),
        })
      ),
      ...paraRemover.map((departamentoId) =>
        fetch(
          `/api/departamentos/${departamentoId}/usuarios?usuario_id=${usuarioId}`,
          { method: "DELETE" }
        )
      ),
    ]);
  };

  const handleSave = async () => {
    if (!form.nome || !form.email || (!isEditing && form.senha.length < 6)) {
      toast.error("Preencha nome, email e uma senha com no mínimo 6 caracteres.");
      return;
    }

    setSaving(true);
    try {
      const res = isEditing
        ? await fetch(`/api/usuarios/${form.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nome: form.nome,
              email: form.email,
              perfil: form.perfil,
            }),
          })
        : await fetch("/api/usuarios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Não foi possível salvar o usuário.");
        return;
      }

      const usuarioId = isEditing ? form.id! : body.id;
      await syncDepartamentos(usuarioId, form.departamentoIds);

      toast.success(isEditing ? "Usuário atualizado." : "Usuário criado.");
      setModalOpen(false);
      await mutate();
    } catch {
      toast.error("Erro de conexão ao salvar usuário.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (usuario: Usuario) => {
    const previous = usuarios;
    await mutate(
      previous?.map((u) => (u.id === usuario.id ? { ...u, ativo: !u.ativo } : u)),
      { revalidate: false }
    );

    try {
      const res = await fetch(`/api/usuarios/${usuario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !usuario.ativo }),
      });
      if (!res.ok) throw new Error();
      toast.success(usuario.ativo ? "Usuário desativado." : "Usuário ativado.");
    } catch {
      await mutate(previous, { revalidate: false });
      toast.error("Não foi possível atualizar o status.");
    }
  };

  const handleDelete = async (usuario: Usuario) => {
    if (!confirm(`Excluir o usuário ${usuario.nome}? Essa ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/usuarios/${usuario.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Não foi possível excluir o usuário.");
        return;
      }
      toast.success("Usuário excluído.");
      await mutate();
    } catch {
      toast.error("Erro de conexão ao excluir usuário.");
    }
  };

  const handleResetSenha = async () => {
    if (!resetTarget || novaSenha.length < 6) {
      toast.error("Informe uma senha com no mínimo 6 caracteres.");
      return;
    }

    setResetting(true);
    try {
      const res = await fetch(`/api/usuarios/${resetTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha: novaSenha }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Não foi possível redefinir a senha.");
        return;
      }
      toast.success(`Senha de ${resetTarget.nome} redefinida.`);
      setResetTarget(null);
      setNovaSenha("");
    } catch {
      toast.error("Erro de conexão ao redefinir senha.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/80">
          Usuários do escritório
        </h2>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" />
          Novo usuário
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Perfil</th>
              <th className="px-4 py-3 font-medium">Ativo</th>
              <th className="px-4 py-3 font-medium">Último acesso</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="px-4 py-3" colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))}

            {!isLoading &&
              usuarios?.map((usuario) => (
                <tr
                  key={usuario.id}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-white">
                    {usuario.nome}
                  </td>
                  <td className="px-4 py-3 text-white/60">{usuario.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="muted">{PERFIL_LABELS[usuario.perfil]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={usuario.ativo}
                      onCheckedChange={() => handleToggleAtivo(usuario)}
                    />
                  </td>
                  <td className="px-4 py-3 text-white/40">
                    {usuario.ultimo_acesso
                      ? formatDistanceToNow(new Date(usuario.ultimo_acesso), {
                          addSuffix: true,
                          locale: ptBR,
                        })
                      : "Nunca"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(usuario)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-white"
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setResetTarget(usuario)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-white"
                        aria-label="Redefinir senha"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(usuario)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-red-400"
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            {!isLoading && usuarios?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="form-nome">Nome</Label>
              <Input
                id="form-nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="form-email">Email</Label>
              <Input
                id="form-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            {!isEditing && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="form-senha">Senha</Label>
                <Input
                  id="form-senha"
                  type="password"
                  value={form.senha}
                  onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="form-perfil">Perfil</Label>
              <select
                id="form-perfil"
                value={form.perfil}
                onChange={(e) =>
                  setForm((f) => ({ ...f, perfil: e.target.value as Perfil }))
                }
                className="rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
              >
                {PERFIL_OPTIONS.map((perfil) => (
                  <option key={perfil} value={perfil}>
                    {PERFIL_LABELS[perfil]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Departamentos</Label>
              <div className="flex flex-wrap gap-2">
                {departamentos.map((dep) => {
                  const checked = form.departamentoIds.includes(dep.id);
                  return (
                    <button
                      key={dep.id}
                      type="button"
                      onClick={() => toggleDepartamento(dep.id)}
                      className={
                        checked
                          ? "rounded-full border border-[#c9a84c]/40 bg-[#c9a84c]/10 px-3 py-1 text-xs text-[#c9a84c]"
                          : "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60"
                      }
                    >
                      {dep.nome}
                    </button>
                  );
                })}
                {departamentos.length === 0 && (
                  <span className="text-xs text-white/40">
                    Nenhum departamento cadastrado.
                  </span>
                )}
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="mt-2">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null);
            setNovaSenha("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha de {resetTarget?.nome}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nova-senha">Nova senha</Label>
              <Input
                id="nova-senha"
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
              />
            </div>
            <Button onClick={handleResetSenha} disabled={resetting}>
              {resetting ? "Salvando..." : "Redefinir senha"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function UsuariosPage() {
  return (
    <div className="p-6">
      <ErrorBoundary label="os usuários">
        <UsuariosView />
      </ErrorBoundary>
    </div>
  );
}
