"use client";

import { useState } from "react";
import { Filter } from "lucide-react";

import { useDepartamentos, useEstagios } from "@/hooks/useDashboard";
import type { LeadsFiltrosState } from "@/hooks/useLeadsFiltros";
import { FILTROS_VAZIOS } from "@/hooks/useLeadsFiltros";
import { ESTAGIO_LABELS } from "@/lib/labels";
import { LEAD_ESTAGIOS, MODO_ATENDIMENTO_LABELS } from "@/types";
import type { ModoAtendimento } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ativo", label: "Ativo" },
  { value: "arquivado", label: "Arquivado" },
  { value: "desqualificado", label: "Desqualificado" },
  { value: "transferido", label: "Transferido" },
  { value: "contrato_enviado", label: "Contrato enviado" },
  { value: "contrato_assinado", label: "Contrato assinado" },
];

const INSTANCIA_OPTIONS: { value: string; label: string }[] = [
  { value: "ads", label: "ADS" },
  { value: "indicacoes", label: "Indicações" },
];

const MODO_OPTIONS: { value: ModoAtendimento; label: string }[] = (
  ["ia", "humano", "pendente"] as ModoAtendimento[]
).map((value) => ({ value, label: MODO_ATENDIMENTO_LABELS[value] }));

type DatePreset = "hoje" | "ontem" | "7dias" | "30dias";

function presetToRange(preset: DatePreset): { de: string; ate: string } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (preset === "ontem") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (preset === "7dias") {
    start.setDate(start.getDate() - 6);
  } else if (preset === "30dias") {
    start.setDate(start.getDate() - 29);
  }

  return { de: start.toISOString().slice(0, 10), ate: end.toISOString().slice(0, 10) };
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function MultiSelectRow({
  label,
  checked,
  onToggle,
  color,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  color?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/80 hover:bg-white/5">
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      {color && (
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      )}
      <span>{label}</span>
    </label>
  );
}

function DateRangeField({
  label,
  de,
  ate,
  onChange,
}: {
  label: string;
  de: string;
  ate: string;
  onChange: (de: string, ate: string) => void;
}) {
  const presets: { key: DatePreset; label: string }[] = [
    { key: "hoje", label: "Hoje" },
    { key: "ontem", label: "Ontem" },
    { key: "7dias", label: "Últimos 7 dias" },
    { key: "30dias", label: "Últimos 30 dias" },
  ];

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-wide text-white/40">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => {
          const range = presetToRange(p.key);
          const active = de === range.de && ate === range.ate;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onChange(range.de, range.ate)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                active
                  ? "border-[#c9a84c] bg-[#c9a84c]/10 text-[#c9a84c]"
                  : "border-white/10 text-white/60 hover:border-white/30"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={de}
          onChange={(e) => onChange(e.target.value, ate)}
          className="text-xs"
        />
        <span className="text-white/30">até</span>
        <Input
          type="date"
          value={ate}
          onChange={(e) => onChange(de, e.target.value)}
          className="text-xs"
        />
      </div>
    </div>
  );
}

interface FiltrosPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filtros: LeadsFiltrosState;
  onAplicar: (filtros: LeadsFiltrosState) => void;
  onLimpar: () => void;
}

export function FiltrosPanel({ open, onOpenChange, filtros, onAplicar, onLimpar }: FiltrosPanelProps) {
  const { departamentos } = useDepartamentos();
  const { estagios } = useEstagios();
  // Sheet desmonta o conteúdo ao fechar (Radix Dialog), então este estado
  // inicial já recaptura `filtros` toda vez que o painel reabre.
  const [draft, setDraft] = useState<LeadsFiltrosState>(filtros);

  const estagioOptions =
    estagios.length > 0
      ? estagios.map((e) => ({ value: e.slug, label: e.nome, color: e.cor }))
      : LEAD_ESTAGIOS.map((e) => ({ value: e, label: ESTAGIO_LABELS[e], color: undefined }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </SheetTitle>
          <SheetDescription>Refine a lista por estágio, status e período.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 overflow-y-auto pb-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-white/40">Busca</span>
            <Input
              placeholder="Nome ou telefone..."
              value={draft.busca}
              onChange={(e) => setDraft({ ...draft, busca: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-white/40">Estágio</span>
            <div className="flex flex-col">
              {estagioOptions.map((opt) => (
                <MultiSelectRow
                  key={opt.value}
                  label={opt.label}
                  color={opt.color}
                  checked={draft.estagio.includes(opt.value)}
                  onToggle={() =>
                    setDraft({ ...draft, estagio: toggleValue(draft.estagio, opt.value) })
                  }
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-white/40">Status</span>
            <div className="flex flex-col">
              {STATUS_OPTIONS.map((opt) => (
                <MultiSelectRow
                  key={opt.value}
                  label={opt.label}
                  checked={draft.status.includes(opt.value)}
                  onToggle={() =>
                    setDraft({ ...draft, status: toggleValue(draft.status, opt.value) })
                  }
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-white/40">Departamento</span>
            <div className="flex flex-col">
              {departamentos.map((dep) => (
                <MultiSelectRow
                  key={dep.id}
                  label={dep.nome}
                  color={dep.cor}
                  checked={draft.departamento_id.includes(dep.id)}
                  onToggle={() =>
                    setDraft({
                      ...draft,
                      departamento_id: toggleValue(draft.departamento_id, dep.id),
                    })
                  }
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-white/40">Instância</span>
            <div className="flex flex-col">
              {INSTANCIA_OPTIONS.map((opt) => (
                <MultiSelectRow
                  key={opt.value}
                  label={opt.label}
                  checked={draft.instancia.includes(opt.value)}
                  onToggle={() =>
                    setDraft({ ...draft, instancia: toggleValue(draft.instancia, opt.value) })
                  }
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-white/40">
              Modo de atendimento
            </span>
            <div className="flex flex-col">
              {MODO_OPTIONS.map((opt) => (
                <MultiSelectRow
                  key={opt.value}
                  label={opt.label}
                  checked={draft.modo_atendimento.includes(opt.value)}
                  onToggle={() =>
                    setDraft({
                      ...draft,
                      modo_atendimento: toggleValue(draft.modo_atendimento, opt.value),
                    })
                  }
                />
              ))}
            </div>
          </div>

          <DateRangeField
            label="Data de criação"
            de={draft.criado_de}
            ate={draft.criado_ate}
            onChange={(de, ate) => setDraft({ ...draft, criado_de: de, criado_ate: ate })}
          />

          <DateRangeField
            label="Último contato"
            de={draft.contato_de}
            ate={draft.contato_ate}
            onChange={(de, ate) => setDraft({ ...draft, contato_de: de, contato_ate: ate })}
          />

          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-white/40">Tem contrato</span>
            <div className="flex gap-1.5">
              {(["", "sim", "nao"] as const).map((v) => (
                <button
                  key={v || "qualquer"}
                  type="button"
                  onClick={() => setDraft({ ...draft, tem_contrato: v })}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    draft.tem_contrato === v
                      ? "border-[#c9a84c] bg-[#c9a84c]/10 text-[#c9a84c]"
                      : "border-white/10 text-white/60 hover:border-white/30"
                  }`}
                >
                  {v === "" ? "Qualquer" : v === "sim" ? "Sim" : "Não"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto flex gap-2 border-t border-white/10 pt-4">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => {
              setDraft(FILTROS_VAZIOS);
              onLimpar();
            }}
          >
            Limpar filtros
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onAplicar(draft);
              onOpenChange(false);
            }}
          >
            Aplicar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface FiltrosButtonProps {
  totalAtivos: number;
  onClick: () => void;
}

export function FiltrosButton({ totalAtivos, onClick }: FiltrosButtonProps) {
  return (
    <Button variant="ghost" onClick={onClick} className="relative border border-white/10">
      <Filter className="h-4 w-4" />
      Filtros
      {totalAtivos > 0 && (
        <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#c9a84c] px-1 text-[10px] font-semibold text-[#0f0f0f]">
          {totalAtivos}
        </span>
      )}
    </Button>
  );
}
