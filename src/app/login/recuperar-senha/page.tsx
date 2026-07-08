"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecuperarSenhaPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(body?.error ?? "Não foi possível enviar o código.");
        return;
      }

      toast.success("Se o email existir, um código foi enviado.");
      router.push("/login/redefinir-senha");
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f] p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center gap-1 p-6">
          <span className="text-2xl font-bold tracking-tight text-[#c9a84c]">
            Piran Hub
          </span>
          <CardTitle className="text-sm font-normal text-white/50">
            Recuperar senha
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? "Enviando..." : "Enviar código"}
            </Button>

            <div className="flex justify-between text-sm">
              <Link href="/login" className="text-white/40 hover:underline">
                Voltar ao login
              </Link>
              <Link
                href="/login/redefinir-senha"
                className="text-[#c9a84c] hover:underline"
              >
                Já tenho um código
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
