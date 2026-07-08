"use client";

import { useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { useSession } from "@/hooks/useSession";
import { PERFIL_LABELS } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function PerfilView() {
  const { user, mutate } = useSession();

  const nomeRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const senhaAtualRef = useRef<HTMLInputElement>(null);
  const novaSenhaRef = useRef<HTMLInputElement>(null);
  const confirmarSenhaRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const handleSalvar = async () => {
    const nome = nomeRef.current?.value ?? "";
    const email = emailRef.current?.value ?? "";
    const senhaAtual = senhaAtualRef.current?.value ?? "";
    const novaSenha = novaSenhaRef.current?.value ?? "";
    const confirmarSenha = confirmarSenhaRef.current?.value ?? "";

    if (novaSenha && novaSenha !== confirmarSenha) {
      toast.error("A nova senha e a confirmação não coincidem.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/usuarios/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          ...(novaSenha ? { senhaAtual, novaSenha } : {}),
        }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? "Não foi possível salvar as alterações.");
        return;
      }

      if (senhaAtualRef.current) senhaAtualRef.current.value = "";
      if (novaSenhaRef.current) novaSenhaRef.current.value = "";
      if (confirmarSenhaRef.current) confirmarSenhaRef.current.value = "";

      await mutate();
      toast.success("Perfil atualizado.");
    } catch {
      toast.error("Erro de conexão ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader className="items-start gap-1 p-6">
          <CardTitle>Meu perfil</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 p-6 pt-0">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#c9a84c]/40 bg-[#c9a84c]/10 text-lg font-semibold text-[#c9a84c]">
              {user ? initials(user.nome) : "..."}
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-white">{user?.nome ?? "..."}</p>
              {user && <Badge variant="muted">{PERFIL_LABELS[user.perfil]}</Badge>}
              <p className="text-xs text-white/40">
                Último acesso:{" "}
                {user?.ultimoAcesso
                  ? formatDistanceToNow(new Date(user.ultimoAcesso), {
                      addSuffix: true,
                      locale: ptBR,
                    })
                  : "primeiro acesso"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                key={user ? `nome-${user.nome}` : "nome-loading"}
                ref={nomeRef}
                defaultValue={user?.nome ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                key={user ? `email-${user.email}` : "email-loading"}
                ref={emailRef}
                defaultValue={user?.email ?? ""}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-white/10 pt-6">
            <p className="text-sm font-medium text-white">Trocar senha</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="senha-atual">Senha atual</Label>
                <Input id="senha-atual" type="password" ref={senhaAtualRef} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="nova-senha">Nova senha</Label>
                <Input id="nova-senha" type="password" ref={novaSenhaRef} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
                <Input id="confirmar-senha" type="password" ref={confirmarSenhaRef} />
              </div>
            </div>
          </div>

          <div>
            <Button onClick={handleSalvar} disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <div className="p-6">
      <ErrorBoundary label="o perfil">
        <PerfilView />
      </ErrorBoundary>
    </div>
  );
}
