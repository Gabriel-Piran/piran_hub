"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Building2,
  Clock,
  Megaphone,
  MessageSquareText,
  Share2,
  Users,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { IntegracaoStatusRow } from "@/components/dashboard/IntegracaoStatus";

interface PerfilConfig {
  nome: string;
  email: string;
  escritorio: string;
  notificacoes: {
    novoLead: boolean;
    novaMensagem: boolean;
    contrato: boolean;
  };
}

function ConfiguracoesView() {
  const { data: config, mutate } = useSWR(
    "/api/configuracoes/perfil",
    (endpoint: string) => apiFetch<PerfilConfig>(endpoint),
    { onError: (err) => console.error("SWR error:", err) }
  );

  const nomeRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const handleSalvar = async () => {
    const nome = nomeRef.current?.value ?? "";
    const email = emailRef.current?.value ?? "";

    setSaving(true);
    try {
      const res = await fetch("/api/configuracoes/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email }),
      });

      if (!res.ok) {
        toast.error("Não foi possível salvar as alterações.");
        return;
      }

      const updated = (await res.json()) as PerfilConfig;
      await mutate(updated, { revalidate: false });
      toast.success("Perfil atualizado.");
    } catch {
      toast.error("Erro de conexão ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleNotificacao = async (
    campo: keyof PerfilConfig["notificacoes"],
    valor: boolean
  ) => {
    if (!config) return;
    const previous = config;
    const updated: PerfilConfig = {
      ...config,
      notificacoes: { ...config.notificacoes, [campo]: valor },
    };
    await mutate(updated, { revalidate: false });

    try {
      const res = await fetch("/api/configuracoes/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificacoes: updated.notificacoes }),
      });
      if (!res.ok) throw new Error();
    } catch {
      await mutate(previous, { revalidate: false });
      toast.error("Não foi possível atualizar a notificação.");
    }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card>
        <CardHeader className="items-start gap-1 p-6">
          <CardTitle>Perfil</CardTitle>
          <p className="text-sm text-white/50">
            Suas informações de conta no Piran Hub.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 p-6 pt-0">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-base">GP</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-white">
                Dr. Gabriel Piran
              </p>
              <p className="text-xs text-white/40">
                {config?.escritorio ??
                  "Escritório Gabriel Piran Sociedade Individual de Advocacia"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                key={config ? `nome-${config.nome}` : "nome-loading"}
                ref={nomeRef}
                defaultValue={config?.nome ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                key={config ? `email-${config.email}` : "email-loading"}
                ref={emailRef}
                defaultValue={config?.email ?? ""}
              />
            </div>
          </div>

          <div>
            <Button onClick={handleSalvar} disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="items-start gap-1 p-6">
          <CardTitle>Notificações</CardTitle>
          <p className="text-sm text-white/50">
            Escolha o que deve gerar um alerta no painel.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-6 pt-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Novo lead recebido</p>
              <p className="text-xs text-white/40">
                Avisar quando um novo lead entrar na recepção.
              </p>
            </div>
            <Switch
              checked={config?.notificacoes.novoLead ?? true}
              onCheckedChange={(v) => handleNotificacao("novoLead", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Nova mensagem no WhatsApp</p>
              <p className="text-xs text-white/40">
                Avisar quando um lead responder uma conversa.
              </p>
            </div>
            <Switch
              checked={config?.notificacoes.novaMensagem ?? true}
              onCheckedChange={(v) => handleNotificacao("novaMensagem", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Contrato assinado</p>
              <p className="text-xs text-white/40">
                Avisar quando um contrato for assinado pelo cliente.
              </p>
            </div>
            <Switch
              checked={config?.notificacoes.contrato ?? false}
              onCheckedChange={(v) => handleNotificacao("contrato", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="items-start gap-1 p-6">
          <CardTitle>Integrações</CardTitle>
          <p className="text-sm text-white/50">
            Instâncias de WhatsApp conectadas ao funil de leads.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-6 pt-0">
          <div className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <Megaphone className="h-5 w-5 text-sky-400" />
              <div>
                <p className="text-sm text-white">Instância Ads</p>
                <p className="text-xs text-white/40">Leads via anúncios pagos</p>
              </div>
            </div>
            <IntegracaoStatusRow instancia="ads" label="Instância Ads" />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <Share2 className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-sm text-white">Instância Indicações</p>
                <p className="text-xs text-white/40">
                  Leads via indicação de clientes
                </p>
              </div>
            </div>
            <IntegracaoStatusRow instancia="indicacoes" label="Instância Indicações" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="items-start gap-1 p-6">
          <CardTitle>Usuários</CardTitle>
          <p className="text-sm text-white/50">
            Gerencie quem tem acesso ao Piran Hub e com qual perfil.
          </p>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <Link
            href="/dashboard/configuracoes/usuarios"
            className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3 transition-colors hover:border-[#c9a84c]/40"
          >
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-[#c9a84c]" />
              <div>
                <p className="text-sm text-white">Gerenciar usuários</p>
                <p className="text-xs text-white/40">
                  Criar, editar, ativar/desativar e redefinir senhas
                </p>
              </div>
            </div>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="items-start gap-1 p-6">
          <CardTitle>Atendimento</CardTitle>
          <p className="text-sm text-white/50">
            Personalize o funil, as mensagens e a organização do atendimento.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-6 pt-0">
          <Link
            href="/dashboard/configuracoes/departamentos"
            className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3 transition-colors hover:border-[#c9a84c]/40"
          >
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-[#c9a84c]" />
              <div>
                <p className="text-sm text-white">Departamentos</p>
                <p className="text-xs text-white/40">
                  Organize equipes e atribua leads por área
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/configuracoes/estagios"
            className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3 transition-colors hover:border-[#c9a84c]/40"
          >
            <div className="flex items-center gap-3">
              <Workflow className="h-5 w-5 text-[#c9a84c]" />
              <div>
                <p className="text-sm text-white">Estágios do funil</p>
                <p className="text-xs text-white/40">
                  Crie, edite e reordene os estágios do funil de leads
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/configuracoes/mensagens-rapidas"
            className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3 transition-colors hover:border-[#c9a84c]/40"
          >
            <div className="flex items-center gap-3">
              <MessageSquareText className="h-5 w-5 text-[#c9a84c]" />
              <div>
                <p className="text-sm text-white">Mensagens rápidas</p>
                <p className="text-xs text-white/40">
                  Modelos de texto, áudio, vídeo e imagem para o atendimento
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/configuracoes/followups"
            className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3 transition-colors hover:border-[#c9a84c]/40"
          >
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-[#c9a84c]" />
              <div>
                <p className="text-sm text-white">Follow-ups automáticos</p>
                <p className="text-xs text-white/40">
                  Regras de reengajamento automático por estágio
                </p>
              </div>
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <div className="p-6">
      <ErrorBoundary label="as configurações">
        <ConfiguracoesView />
      </ErrorBoundary>
    </div>
  );
}
