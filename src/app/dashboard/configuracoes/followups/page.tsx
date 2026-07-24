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
import { cn } from "@/lib/utils";

interface FormState {
  id?: string;
  nome: string;
  estagio_gatilho: string;
  dias_espera: string;
  hora_envio: string;
  mensagem_rapida_id: string;
  mensagem_texto: string;
  horario_inicio: string;
  horario_fim: string;
  intervalo_minutos_min: string;
  intervalo_minutos_max: string;
  dias_semana: string[];
}

const EMPTY_FORM: FormState = {
  nome: "",
  estagio_gatilho: "",
  dias_espera: "1",
  hora_envio: "09:00",
  mensagem_rapida_id: "",
  mensagem_texto: "",
  horario_inicio: "08:00",
  horario_fim: "18:00",
  intervalo_minutos_min: "1",
  intervalo_minutos_max: "5",
  dias_semana: ["1", "2", "3", "4", "5"],
};

function useFollowupRegras() {
  const { data, isLoading, mutate } = useSWR(
    "/api/followup-regras",
    (endpoint: string) => apiFetch<FollowupRegra[]>(endpoint),
    { onError: (err) => console.error("SWR error:", err) }
  );

  return { regras: Array.isArray(data) ? data : [], isLoading, mutate };
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

  const openEdit = (regra: any) => {
    setForm({
      id: regra.id,
      nome: regra.nome,
      estagio_gatilho: regra.estagio_gatilho,
      dias_espera: String(regra.dias_espera),
      hora_envio: regra.hora_envio?.slice(0, 5) ?? "09:00",
      mensagem_rapida_id: regra.mensagem_rapida_id ?? "",
      mensagem_texto: regra.mensagem_texto ?? "",
      horario_inicio: regra.horario_inicio?.slice(0, 5) ?? "08:00",
      horario_fim: regra.horario_fim?.slice(0, 5) ?? "18:00",
      intervalo_minutos_min: String(regra.intervalo_minutos_min ?? 1),
      intervalo_minutos_max: String(regra.intervalo_minutos_max ?? 5),
      dias_semana: Array.isArray(regra.dias_semana) ? regra.dias_semana : ["1", "2", "3", "4", "5"],
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
      horario_inicio: form.horario_inicio,
      horario_fim: form.horario_fim,
      intervalo_minutos_min: Number(form.intervalo_minutos_min),
      intervalo_minutos_max: Number(form.intervalo_minutos_max),
      dias_semana: form.dias_semana,
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

            <div className="border-t border-white/10 pt-4 flex flex-col gap-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">Horário Comercial e Anti-Ban</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="fu-horario-inicio">Horário de Início</Label>
                  <Input
                    id="fu-horario-inicio"
                    type="time"
                    value={form.horario_inicio}
                    onChange={(e) => setForm((f) => ({ ...f, horario_inicio: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="fu-horario-fim">Horário de Fim</Label>
                  <Input
                    id="fu-horario-fim"
                    type="time"
                    value={form.horario_fim}
                    onChange={(e) => setForm((f) => ({ ...f, horario_fim: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="fu-int-min">Intervalo Mínimo (min)</Label>
                  <Input
                    id="fu-int-min"
                    type="number"
                    min={1}
                    value={form.intervalo_minutos_min}
                    onChange={(e) => setForm((f) => ({ ...f, intervalo_minutos_min: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="fu-int-max">Intervalo Máximo (min)</Label>
                  <Input
                    id="fu-int-max"
                    type="number"
                    min={1}
                    value={form.intervalo_minutos_max}
                    onChange={(e) => setForm((f) => ({ ...f, intervalo_minutos_max: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Dias da Semana para Envios</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {[
                    { value: "1", label: "Seg" },
                    { value: "2", label: "Ter" },
                    { value: "3", label: "Qua" },
                    { value: "4", label: "Qui" },
                    { value: "5", label: "Sex" },
                    { value: "6", label: "Sáb" },
                    { value: "0", label: "Dom" },
                  ].map((d) => {
                    const checked = form.dias_semana.includes(d.value);
                    return (
                      <label
                        key={d.value}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-all select-none",
                          checked
                            ? "bg-[#c9a84c]/20 border-[#c9a84c] text-[#c9a84c]"
                            : "border-white/10 hover:border-white/20 text-white/60"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm((f) => ({ ...f, dias_semana: [...f.dias_semana, d.value] }));
                            } else {
                              setForm((f) => ({
                                ...f,
                                dias_semana: f.dias_semana.filter((val) => val !== d.value),
                              }));
                            }
                          }}
                        />
                        {d.label}
                      </label>
                    );
                  })}
                </div>
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

      <QueueMonitor regras={regras} />
    </div>
  );
}

function QueueMonitor({ regras }: { regras: any[] }) {
  const [status, setStatus] = useState("todos");
  const [regraId, setRegraId] = useState("todos");
  const [data, setData] = useState("");

  const url = `/api/followup/fila?status=${status}&regra_id=${regraId}&data=${data}`;
  const { data: queue, isLoading, mutate } = useSWR(url, (endpoint) =>
    fetch(endpoint).then((r) => r.json()).catch(() => [])
  );

  const handleCancelar = async (item: any) => {
    try {
      const isPrevisto = item.status === "previsto";
      const res = await fetch("/api/followup/fila", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isPrevisto
            ? { lead_id: item.lead_id, regra_id: item.regra_id, acao: "cancelar" }
            : { id: item.id, acao: "cancelar" }
        ),
      });
      if (!res.ok) throw new Error();
      toast.success("Envio cancelado com sucesso.");
      mutate();
    } catch {
      toast.error("Não foi possível cancelar o envio.");
    }
  };

  const handleReagendar = async (id: string) => {
    try {
      const res = await fetch("/api/followup/fila", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, acao: "reagendar" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Envio reagendado com sucesso.");
      mutate();
    } catch {
      toast.error("Não foi possível reagendar o envio.");
    }
  };

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "pendente":
        return <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">Pendente</Badge>;
      case "enviado":
        return <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">Enviado</Badge>;
      case "erro":
        return <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">Erro</Badge>;
      case "cancelado":
        return <Badge className="bg-white/10 text-white/40 border border-white/5">Cancelado</Badge>;
      case "previsto":
        return <Badge className="bg-sky-500/20 text-sky-400 border border-sky-500/30">Previsto</Badge>;
      default:
        return <Badge variant="default">{s}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-4 mt-8 border-t border-white/10 pt-8">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-white/80">Fila de Envio e Monitoramento</h3>
        <p className="text-xs text-white/40">Monitore, cancele ou re-agende envios em tempo real.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#1a1a1a] p-4 rounded-xl border border-white/10">
        <div className="flex flex-col gap-2">
          <Label htmlFor="q-status">Status</Label>
          <select
            id="q-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
          >
            <option value="todos">Todos</option>
            <option value="previsto">Previsto</option>
            <option value="pendente">Pendente</option>
            <option value="enviado">Enviado</option>
            <option value="erro">Erro</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="q-regra">Regra</Label>
          <select
            id="q-regra"
            value={regraId}
            onChange={(e) => setRegraId(e.target.value)}
            className="rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
          >
            <option value="todos">Todas</option>
            {regras.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="q-data">Data de Agendamento</Label>
          <Input
            id="q-data"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
              <th className="px-4 py-3 font-medium">Lead</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">Regra</th>
              <th className="px-4 py-3 font-medium">Agendado para</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Info / Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-6 w-full" />
                </td>
              </tr>
            )}

            {!isLoading && Array.isArray(queue) && queue.map((item: any) => {
              const leadName = item.leads?.nome || "Lead";
              const leadPhone = item.leads?.numero_whatsapp || "—";
              const ruleName = item.followup_regras?.nome || "—";
              
              return (
                <tr key={item.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{leadName}</td>
                  <td className="px-4 py-3 text-white/60">{leadPhone}</td>
                  <td className="px-4 py-3 text-white/60">{ruleName}</td>
                  <td className="px-4 py-3 text-white/60">{formatDateTime(item.agendado_para)}</td>
                  <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {item.status === "erro" && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-400 max-w-[200px] truncate" title={item.erro_mensagem}>
                            {item.erro_mensagem}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReagendar(item.id)}
                            className="h-7 text-xs px-2 border border-green-500/30 text-green-400 hover:bg-green-500/10"
                          >
                            Reagendar
                          </Button>
                        </div>
                      )}
                      {(item.status === "pendente" || item.status === "previsto") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelar(item)}
                          className="h-7 text-xs px-2 border border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          Cancelar
                        </Button>
                      )}
                      {item.status !== "pendente" && item.status !== "erro" && item.status !== "previsto" && (
                        <span className="text-xs text-white/20">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {!isLoading && (!Array.isArray(queue) || queue.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                  Nenhum item na fila para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
