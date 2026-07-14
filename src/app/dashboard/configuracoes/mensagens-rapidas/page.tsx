"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, UploadCloud, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";

import { useDepartamentos, useMensagensRapidas } from "@/hooks/useDashboard";
import type { MensagemRapida, MensagemRapidaTipo } from "@/types";
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

const TIPO_OPTIONS: MensagemRapidaTipo[] = ["texto", "audio", "video", "imagem"];
const TIPO_LABELS: Record<MensagemRapidaTipo, string> = {
  texto: "Texto",
  audio: "Áudio",
  video: "Vídeo",
  imagem: "Imagem",
};
const TIPO_BADGE_CLASS: Record<MensagemRapidaTipo, string> = {
  texto: "border-white/10 bg-white/5 text-white/60",
  audio: "border-sky-500/40 bg-sky-500/10 text-sky-400",
  video: "border-violet-500/40 bg-violet-500/10 text-violet-400",
  imagem: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
};

interface FormState {
  id?: string;
  titulo: string;
  tipo: MensagemRapidaTipo;
  conteudo: string;
  midia_url: string;
  atalho: string;
  departamento_id: string;
}

const EMPTY_FORM: FormState = {
  titulo: "",
  tipo: "texto",
  conteudo: "",
  midia_url: "",
  atalho: "",
  departamento_id: "",
};

interface MediaUploadZoneProps {
  value: string;
  onChange: (url: string) => void;
  messageId?: string;
}

function MediaUploadZone({ value, onChange, messageId }: MediaUploadZoneProps) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 16 * 1024 * 1024) {
      toast.error("O arquivo excede o limite máximo de 16MB.");
      return;
    }

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    if (messageId) {
      formData.append("id", messageId);
    }

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload/midia-rapida", true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
        }
      };

      xhr.onload = () => {
        setUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.url) {
              onChange(res.url);
              toast.success("Mídia carregada com sucesso.");
            } else {
              toast.error("Erro no retorno da URL da mídia.");
            }
          } catch {
            toast.error("Erro ao processar resposta do upload.");
          }
        } else {
          toast.error("Erro ao enviar mídia.");
        }
      };

      xhr.onerror = () => {
        setUploading(false);
        toast.error("Erro na conexão durante o upload.");
      };

      xhr.send(formData);
    } catch (err) {
      setUploading(false);
      toast.error("Erro ao iniciar o upload.");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 16 * 1024 * 1024,
    accept: {
      "image/*": [],
      "audio/*": [],
      "video/*": [],
      "application/pdf": [],
    },
    multiple: false,
  });

  return (
    <div className="flex flex-col gap-2">
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors min-h-[120px]",
          isDragActive
            ? "border-[#c9a84c] bg-[#c9a84c]/5"
            : "border-white/10 hover:border-white/20 bg-white/5"
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="h-8 w-8 text-white/50 mb-2" />
        {isDragActive ? (
          <p className="text-xs text-white/70">Solte o arquivo aqui...</p>
        ) : (
          <p className="text-xs text-white/50 text-center">
            Arraste e solte o arquivo aqui, ou{" "}
            <span className="text-[#c9a84c] font-medium">clique para selecionar</span>
            <br />
            <span className="text-[10px] opacity-60">(Máx: 16MB. Imagem, Áudio, Vídeo ou PDF)</span>
          </p>
        )}
      </div>

      {uploading && (
        <div className="flex flex-col gap-1 w-full bg-white/5 border border-white/10 rounded-md p-2">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>Enviando arquivo...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#c9a84c] h-full rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {value && !uploading && (
        <div className="flex items-center gap-3 rounded-md bg-white/5 border border-white/10 p-2">
          {/\.(jpeg|jpg|gif|png|webp|svg)/i.test(value) || value.includes("/imagens/") ? (
            <img src={value} alt="Preview" className="h-10 w-10 rounded object-cover" />
          ) : (
            <FileText className="h-6 w-6 text-[#c9a84c] shrink-0" />
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[11px] font-medium text-white truncate">{value}</span>
            <span className="text-[9px] text-white/40">URL da mídia</span>
          </div>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-[#c9a84c] hover:underline"
          >
            Visualizar
          </a>
        </div>
      )}
    </div>
  );
}

function MensagensRapidasView() {
  const { mensagensRapidas, isLoading, mutate } = useMensagensRapidas();
  const { departamentos } = useDepartamentos();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      // Pré-gera o id para permitir upload de mídia antes de o registro
      // existir no banco — não confundir com "está editando" (o registro
      // ainda não foi inserido; handleSave deve chamar POST, não PATCH).
      id: crypto.randomUUID(),
    });
    setIsEditing(false);
    setModalOpen(true);
  };

  const openEdit = (msg: MensagemRapida) => {
    setForm({
      id: msg.id,
      titulo: msg.titulo,
      tipo: msg.tipo,
      conteudo: msg.conteudo ?? "",
      midia_url: msg.midia_url ?? "",
      atalho: msg.atalho ?? "",
      departamento_id: msg.departamento_id ?? "",
    });
    setIsEditing(true);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      toast.error("Informe o título da mensagem.");
      return;
    }
    if (form.tipo === "texto" && !form.conteudo.trim()) {
      toast.error("Informe o conteúdo da mensagem de texto.");
      return;
    }
    if (form.tipo !== "texto" && !form.midia_url.trim()) {
      toast.error("Informe ou carregue o arquivo de mídia.");
      return;
    }

    const payload = {
      id: form.id,
      titulo: form.titulo,
      tipo: form.tipo,
      conteudo: form.tipo === "texto" ? form.conteudo : null,
      midia_url: form.tipo !== "texto" ? form.midia_url : null,
      atalho: form.atalho || null,
      departamento_id: form.departamento_id || null,
    };

    setSaving(true);
    try {
      const res = isEditing
        ? await fetch(`/api/mensagens-rapidas/${form.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/mensagens-rapidas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Não foi possível salvar a mensagem.");
        return;
      }

      toast.success(isEditing ? "Mensagem atualizada." : "Mensagem criada.");
      setModalOpen(false);
      await mutate();
    } catch {
      toast.error("Erro de conexão ao salvar mensagem.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (msg: MensagemRapida) => {
    try {
      const res = await fetch(`/api/mensagens-rapidas/${msg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !msg.ativo }),
      });
      if (!res.ok) throw new Error();
      await mutate();
    } catch {
      toast.error("Não foi possível atualizar o status.");
    }
  };

  const handleDelete = async (msg: MensagemRapida) => {
    if (!confirm(`Excluir a mensagem "${msg.titulo}"?`)) return;

    try {
      const res = await fetch(`/api/mensagens-rapidas/${msg.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Não foi possível excluir a mensagem.");
        return;
      }
      toast.success("Mensagem excluída.");
      await mutate();
    } catch {
      toast.error("Erro de conexão ao excluir mensagem.");
    }
  };

  const departamentoNome = (id: string | null) =>
    departamentos.find((d) => d.id === id)?.nome ?? "Todos";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/80">Mensagens rápidas</h2>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" />
          Nova mensagem
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Atalho</th>
              <th className="px-4 py-3 font-medium">Departamento</th>
              <th className="px-4 py-3 font-medium">Ativo</th>
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
              mensagensRapidas.map((msg) => (
                <tr key={msg.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-medium text-white">{msg.titulo}</td>
                  <td className="px-4 py-3">
                    <Badge className={TIPO_BADGE_CLASS[msg.tipo]}>
                      {TIPO_LABELS[msg.tipo]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-white/60">{msg.atalho ?? "—"}</td>
                  <td className="px-4 py-3 text-white/60">
                    {departamentoNome(msg.departamento_id)}
                  </td>
                  <td className="px-4 py-3">
                    <Switch checked={msg.ativo} onCheckedChange={() => handleToggleAtivo(msg)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(msg)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-white"
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(msg)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-red-400"
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            {!isLoading && mensagensRapidas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                  Nenhuma mensagem rápida cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar mensagem" : "Nova mensagem rápida"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="msg-titulo">Título</Label>
              <Input
                id="msg-titulo"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="msg-tipo">Tipo</Label>
              <select
                id="msg-tipo"
                value={form.tipo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tipo: e.target.value as MensagemRapidaTipo }))
                }
                className="rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
              >
                {TIPO_OPTIONS.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {TIPO_LABELS[tipo]}
                  </option>
                ))}
              </select>
            </div>

            {form.tipo === "texto" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="msg-conteudo">Conteúdo</Label>
                <textarea
                  id="msg-conteudo"
                  value={form.conteudo}
                  onChange={(e) => setForm((f) => ({ ...f, conteudo: e.target.value }))}
                  rows={4}
                  className="rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Label>Mídia</Label>
                <MediaUploadZone
                  value={form.midia_url}
                  onChange={(url) => setForm((f) => ({ ...f, midia_url: url }))}
                  messageId={form.id}
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="msg-atalho">Atalho</Label>
              <Input
                id="msg-atalho"
                value={form.atalho}
                onChange={(e) => setForm((f) => ({ ...f, atalho: e.target.value }))}
                placeholder="/proposta"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="msg-departamento">Departamento</Label>
              <select
                id="msg-departamento"
                value={form.departamento_id}
                onChange={(e) => setForm((f) => ({ ...f, departamento_id: e.target.value }))}
                className="rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
              >
                <option value="">Todos os departamentos</option>
                {departamentos.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    {dep.nome}
                  </option>
                ))}
              </select>
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

export default function MensagensRapidasPage() {
  return (
    <div className="p-6">
      <ErrorBoundary label="as mensagens rápidas">
        <MensagensRapidasView />
      </ErrorBoundary>
    </div>
  );
}
