"use client";

import { useState } from "react";
import { Archive, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";

import { useDepartamentos, useEstagios } from "@/hooks/useDashboard";
import { ESTAGIO_LABELS } from "@/lib/labels";
import { LEAD_ESTAGIOS } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BulkAcao = "estagio" | "departamento" | "arquivar";

interface BulkActionBarProps {
  selectedIds: string[];
  onClear: () => void;
  onDone: () => void;
}

function DropdownButton({
  label,
  options,
  onSelect,
}: {
  label: string;
  options: { value: string; label: string; color?: string }[];
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" className="border border-white/10" onClick={() => setOpen((v) => !v)}>
        {label}
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-56 overflow-y-auto rounded-md border border-white/10 bg-[#1a1a1a] p-1 shadow-xl">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setOpen(false);
                  onSelect(opt.value);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-white/80 hover:bg-white/10"
              >
                {opt.color && (
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: opt.color }} />
                )}
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function BulkActionBar({ selectedIds, onClear, onDone }: BulkActionBarProps) {
  const { estagios } = useEstagios();
  const { departamentos } = useDepartamentos();
  const [confirmArquivar, setConfirmArquivar] = useState(false);
  const [loading, setLoading] = useState(false);

  if (selectedIds.length === 0) return null;

  const estagioOptions =
    estagios.length > 0
      ? estagios.map((e) => ({ value: e.slug, label: e.nome, color: e.cor }))
      : LEAD_ESTAGIOS.map((e) => ({ value: e, label: ESTAGIO_LABELS[e] }));

  const departamentoOptions = departamentos.map((d) => ({
    value: d.id,
    label: d.nome,
    color: d.cor,
  }));

  const executar = async (acao: BulkAcao, valor?: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, acao, valor }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error ?? "Não foi possível atualizar os leads.");
        return;
      }
      const data = await res.json();
      toast.success(`${data.atualizados} leads atualizados com sucesso`);
      onDone();
    } catch {
      toast.error("Erro de conexão ao atualizar os leads.");
    } finally {
      setLoading(false);
      setConfirmArquivar(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-3 rounded-xl border border-[#c9a84c]/30 bg-[#1a1a1a] px-4 py-3 shadow-lg">
        <span className="text-sm font-medium text-white">
          {selectedIds.length} leads selecionados
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <DropdownButton
            label="Mudar estágio"
            options={estagioOptions}
            onSelect={(valor) => executar("estagio", valor)}
          />
          <DropdownButton
            label="Mudar departamento"
            options={departamentoOptions}
            onSelect={(valor) => executar("departamento", valor)}
          />
          <Button
            variant="ghost"
            size="sm"
            className="border border-red-500/30 text-red-400 hover:bg-red-500/10"
            disabled={loading}
            onClick={() => setConfirmArquivar(true)}
          >
            <Archive className="h-3.5 w-3.5" />
            Arquivar
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="h-3.5 w-3.5" />
            Desmarcar todos
          </Button>
        </div>
      </div>

      <Dialog open={confirmArquivar} onOpenChange={setConfirmArquivar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arquivar leads selecionados?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/60">
            {selectedIds.length} leads serão marcados como arquivados. Essa ação pode ser
            desfeita reativando cada lead individualmente.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmArquivar(false)}>
              Cancelar
            </Button>
            <Button
              disabled={loading}
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={() => executar("arquivar")}
            >
              {loading ? "Arquivando..." : "Arquivar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
