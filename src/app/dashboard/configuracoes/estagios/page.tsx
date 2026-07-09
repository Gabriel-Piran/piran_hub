"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useEstagios } from "@/hooks/useDashboard";
import type { EstagioCustomizado } from "@/types";
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

interface FormState {
  id?: string;
  nome: string;
  slug: string;
  cor: string;
}

const EMPTY_FORM: FormState = { nome: "", slug: "", cor: "#6b7280" };

function SortableRow({
  estagio,
  onEdit,
  onDelete,
  onToggleAtivo,
}: {
  estagio: EstagioCustomizado;
  onEdit: (e: EstagioCustomizado) => void;
  onDelete: (e: EstagioCustomizado) => void;
  onToggleAtivo: (e: EstagioCustomizado) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: estagio.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0",
        isDragging && "bg-white/5"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-white/30 hover:text-white/60"
        aria-label="Reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: estagio.cor }}
      />
      <div className="flex flex-1 flex-col">
        <span className="text-sm font-medium text-white">{estagio.nome}</span>
        <span className="text-xs text-white/40">{estagio.slug}</span>
      </div>
      <Switch checked={estagio.ativo} onCheckedChange={() => onToggleAtivo(estagio)} />
      <button
        onClick={() => onEdit(estagio)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-white"
        aria-label="Editar"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        onClick={() => onDelete(estagio)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-red-400"
        aria-label="Excluir"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function EstagiosView() {
  const { estagios, isLoading, mutate } = useEstagios();
  const [ordenados, setOrdenados] = useState<EstagioCustomizado[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOrdenados(estagios);
  }, [estagios]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const isEditing = Boolean(form.id);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (estagio: EstagioCustomizado) => {
    setForm({ id: estagio.id, nome: estagio.nome, slug: estagio.slug, cor: estagio.cor });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.slug.trim()) {
      toast.error("Informe nome e slug do estágio.");
      return;
    }

    setSaving(true);
    try {
      const res = isEditing
        ? await fetch(`/api/estagios/${form.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: form.nome, slug: form.slug, cor: form.cor }),
          })
        : await fetch("/api/estagios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: form.nome, slug: form.slug, cor: form.cor }),
          });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Não foi possível salvar o estágio.");
        return;
      }

      toast.success(isEditing ? "Estágio atualizado." : "Estágio criado.");
      setModalOpen(false);
      await mutate();
    } catch {
      toast.error("Erro de conexão ao salvar estágio.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (estagio: EstagioCustomizado) => {
    try {
      const res = await fetch(`/api/estagios/${estagio.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !estagio.ativo }),
      });
      if (!res.ok) throw new Error();
      await mutate();
    } catch {
      toast.error("Não foi possível atualizar o status.");
    }
  };

  const handleDelete = async (estagio: EstagioCustomizado) => {
    if (!confirm(`Excluir o estágio ${estagio.nome}?`)) return;

    try {
      const res = await fetch(`/api/estagios/${estagio.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Não foi possível excluir o estágio.");
        return;
      }
      toast.success("Estágio excluído.");
      await mutate();
    } catch {
      toast.error("Erro de conexão ao excluir estágio.");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ordenados.findIndex((e) => e.id === active.id);
    const newIndex = ordenados.findIndex((e) => e.id === over.id);
    const novaOrdem = arrayMove(ordenados, oldIndex, newIndex);
    setOrdenados(novaOrdem);

    try {
      const res = await fetch("/api/estagios/reordenar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: novaOrdem.map((e) => e.id) }),
      });
      if (!res.ok) throw new Error();
      await mutate();
    } catch {
      toast.error("Não foi possível salvar a nova ordem.");
      setOrdenados(estagios);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/80">Estágios do funil</h2>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" />
          Novo estágio
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b border-white/5 px-4 py-3">
              <Skeleton className="h-5 w-full" />
            </div>
          ))}

        {!isLoading && ordenados.length === 0 && (
          <p className="px-4 py-8 text-center text-white/40">
            Nenhum estágio cadastrado.
          </p>
        )}

        {!isLoading && ordenados.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={ordenados.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              {ordenados.map((estagio) => (
                <SortableRow
                  key={estagio.id}
                  estagio={estagio}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onToggleAtivo={handleToggleAtivo}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar estágio" : "Novo estágio"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="est-nome">Nome</Label>
              <Input
                id="est-nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="est-slug">Slug</Label>
              <Input
                id="est-slug"
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value.toUpperCase() }))
                }
                placeholder="EX_ESTAGIO"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="est-cor">Cor</Label>
              <input
                id="est-cor"
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

export default function EstagiosPage() {
  return (
    <div className="p-6">
      <ErrorBoundary label="os estágios">
        <EstagiosView />
      </ErrorBoundary>
    </div>
  );
}
