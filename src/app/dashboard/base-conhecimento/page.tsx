"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import type { BaseConhecimentoItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { cn } from "@/lib/utils";

const NOVA_ENTRADA: Omit<BaseConhecimentoItem, "id" | "criado_em" | "atualizado_em"> = {
  categoria: "",
  titulo: "",
  quando_usar: "",
  exemplos_frases: [],
  resposta_modelo: "",
  ordem: 0,
  ativo: true,
};

function useBaseConhecimento() {
  const { data, isLoading, mutate } = useSWR(
    "/api/base-conhecimento",
    (endpoint: string) => apiFetch<BaseConhecimentoItem[]>(endpoint),
    { onError: (err) => console.error("SWR error:", err) }
  );

  return { itens: Array.isArray(data) ? data : [], isLoading, mutate };
}

function Editor({
  item,
  readOnly,
  isNovo,
  onSaved,
  onDeleted,
}: {
  item: BaseConhecimentoItem;
  readOnly: boolean;
  isNovo: boolean;
  onSaved: (item: BaseConhecimentoItem) => void;
  onDeleted: (id: string) => void;
}) {
  const [categoria, setCategoria] = useState(item.categoria);
  const [titulo, setTitulo] = useState(item.titulo);
  const [quandoUsar, setQuandoUsar] = useState(item.quando_usar);
  const [respostaModelo, setRespostaModelo] = useState(item.resposta_modelo);
  const [exemplos, setExemplos] = useState<string[]>(item.exemplos_frases);
  const [novaFrase, setNovaFrase] = useState("");
  const [ativo, setAtivo] = useState(item.ativo);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const adicionarFrase = () => {
    const frase = novaFrase.trim();
    if (!frase || exemplos.includes(frase)) {
      setNovaFrase("");
      return;
    }
    setExemplos((f) => [...f, frase]);
    setNovaFrase("");
  };

  const removerFrase = (frase: string) => {
    setExemplos((f) => f.filter((x) => x !== frase));
  };

  const handleSave = async () => {
    if (!categoria.trim() || !titulo.trim() || !quandoUsar.trim() || !respostaModelo.trim()) {
      toast.error("Preencha categoria, título, quando usar e a resposta modelo.");
      return;
    }

    const payload = {
      categoria: categoria.trim(),
      titulo: titulo.trim(),
      quando_usar: quandoUsar.trim(),
      exemplos_frases: exemplos,
      resposta_modelo: respostaModelo.trim(),
      ativo,
    };

    setSaving(true);
    try {
      const res = isNovo
        ? await fetch("/api/base-conhecimento", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/base-conhecimento/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Não foi possível salvar o tópico.");
        return;
      }

      toast.success(isNovo ? "Tópico criado." : "Tópico salvo — a Aline já usa a nova versão.");
      onSaved(body as BaseConhecimentoItem);
    } catch {
      toast.error("Erro de conexão ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Excluir o tópico "${item.titulo}"?`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/base-conhecimento/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Não foi possível excluir o tópico.");
        return;
      }
      toast.success("Tópico excluído.");
      onDeleted(item.id);
    } catch {
      toast.error("Erro de conexão ao excluir.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-1 p-6">
        <div>
          <CardTitle>{isNovo ? "Novo tópico" : item.titulo}</CardTitle>
          <p className="text-sm text-white/50">
            A Aline usa isso como referência pra responder dúvidas parecidas — não precisa ser a frase exata.
          </p>
        </div>
        {!isNovo && !readOnly && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-red-400"
            aria-label="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-5 p-6 pt-0">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bc-categoria">Categoria</Label>
            <Input
              id="bc-categoria"
              value={categoria}
              disabled={readOnly}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ex.: Objeções e Medos"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bc-titulo">Título</Label>
            <Input
              id="bc-titulo"
              value={titulo}
              disabled={readOnly}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: TENHO MEDO DE PROCESSAR"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="bc-quando">Quando usar</Label>
          <textarea
            id="bc-quando"
            value={quandoUsar}
            disabled={readOnly}
            onChange={(e) => setQuandoUsar(e.target.value)}
            rows={2}
            className="w-full resize-y rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Descreva a situação em que esse tópico se aplica"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="bc-frase">Exemplos de frases</Label>
          {!readOnly && (
            <Input
              id="bc-frase"
              value={novaFrase}
              onChange={(e) => setNovaFrase(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  adicionarFrase();
                }
              }}
              placeholder="Digite e pressione Enter"
            />
          )}
          <div className="flex flex-wrap gap-2 mt-1">
            {exemplos.map((frase) => (
              <span
                key={frase}
                className="flex items-center gap-1 rounded-full border border-[#c9a84c]/40 bg-[#c9a84c]/10 px-2 py-1 text-xs text-[#c9a84c]"
              >
                {frase}
                {!readOnly && (
                  <button onClick={() => removerFrase(frase)} aria-label={`Remover ${frase}`}>
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
            {exemplos.length === 0 && (
              <span className="text-xs text-white/40">Nenhum exemplo cadastrado ainda.</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="bc-resposta">Resposta modelo</Label>
            <span className="text-xs text-white/40">
              {respostaModelo.length.toLocaleString("pt-BR")} caracteres
            </span>
          </div>
          <textarea
            id="bc-resposta"
            value={respostaModelo}
            disabled={readOnly}
            onChange={(e) => setRespostaModelo(e.target.value)}
            rows={10}
            spellCheck={false}
            className="w-full resize-y rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2 font-mono text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Tópico ativo</p>
            <p className="text-xs text-white/40">
              Se desativado, a Aline ignora esse tópico ao responder.
            </p>
          </div>
          <Switch checked={ativo} onCheckedChange={setAtivo} disabled={readOnly} />
        </div>

        {!readOnly && (
          <div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : isNovo ? "Criar tópico" : "Salvar"}
            </Button>
          </div>
        )}

        {readOnly && (
          <p className="text-xs text-white/40">
            Seu perfil tem acesso somente para visualização da base de conhecimento.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function BaseConhecimentoView() {
  const { itens, isLoading, mutate } = useBaseConhecimento();
  const { user } = useSession();
  const readOnly = user?.perfil !== "admin";

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [criandoNovo, setCriandoNovo] = useState(false);
  const [busca, setBusca] = useState("");

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return itens;
    return itens.filter((item) => {
      const alvo = [
        item.categoria,
        item.titulo,
        item.quando_usar,
        item.resposta_modelo,
        ...(item.exemplos_frases ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return alvo.includes(termo);
    });
  }, [itens, busca]);

  const categorias = useMemo(() => {
    const grupos = new Map<string, BaseConhecimentoItem[]>();
    for (const item of itensFiltrados) {
      const lista = grupos.get(item.categoria) ?? [];
      lista.push(item);
      grupos.set(item.categoria, lista);
    }
    return Array.from(grupos.entries());
  }, [itensFiltrados]);

  const selected = criandoNovo
    ? null
    : itens.find((i) => i.id === selectedId) ?? itensFiltrados[0] ?? null;

  const handleSaved = (updated: BaseConhecimentoItem) => {
    setCriandoNovo(false);
    setSelectedId(updated.id);
    mutate(
      (current) => {
        if (!current) return [updated];
        const existe = current.some((i) => i.id === updated.id);
        return existe ? current.map((i) => (i.id === updated.id ? updated : i)) : [...current, updated];
      },
      { revalidate: false }
    );
  };

  const handleDeleted = (id: string) => {
    setSelectedId(null);
    mutate((current) => current?.filter((i) => i.id !== id), { revalidate: false });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="flex w-80 shrink-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white/80">Base de conhecimento</h2>
          {!readOnly && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCriandoNovo(true);
                setSelectedId(null);
              }}
            >
              <Plus className="h-4 w-4" />
              Novo
            </Button>
          )}
        </div>

        <div className="border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 rounded-md border border-white/10 bg-[#0f0f0f] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-white/40" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título, frase, categoria..."
              className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto">
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}

          {!isLoading &&
            categorias.map(([categoria, lista]) => (
              <div key={categoria} className="border-b border-white/5">
                <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                  {categoria}
                </div>
                {lista.map((item) => {
                  const isSelected = !criandoNovo && selected?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCriandoNovo(false);
                        setSelectedId(item.id);
                      }}
                      className={cn(
                        "flex w-full flex-col gap-1 px-4 py-2.5 text-left transition-colors hover:bg-white/5",
                        isSelected && "bg-[#c9a84c]/10"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm text-white">{item.titulo}</p>
                        {!item.ativo && (
                          <Badge variant="muted" className="text-[10px]">
                            inativo
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-white/30">
                        Atualizado{" "}
                        {formatDistanceToNow(new Date(item.atualizado_em), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </button>
                  );
                })}
              </div>
            ))}

          {!isLoading && itens.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-white/40">
              Nenhum tópico cadastrado ainda.
            </p>
          )}

          {!isLoading && itens.length > 0 && itensFiltrados.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-white/40">
              Nenhum tópico encontrado para "{busca}".
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#1a1a1a] p-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {!isLoading && criandoNovo && (
          <Editor
            key="novo"
            item={{ ...NOVA_ENTRADA, id: "", criado_em: "", atualizado_em: "" }}
            readOnly={false}
            isNovo
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        )}

        {!isLoading && !criandoNovo && selected && (
          <Editor
            key={selected.id}
            item={selected}
            readOnly={readOnly}
            isNovo={false}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        )}

        {!isLoading && !criandoNovo && !selected && (
          <div className="flex h-full items-center justify-center rounded-xl border border-white/10 bg-[#1a1a1a] text-sm text-white/40">
            Nenhum tópico encontrado.
          </div>
        )}
      </div>
    </div>
  );
}

export default function BaseConhecimentoPage() {
  return (
    <div className="p-6">
      <ErrorBoundary label="a base de conhecimento">
        <BaseConhecimentoView />
      </ErrorBoundary>
    </div>
  );
}
