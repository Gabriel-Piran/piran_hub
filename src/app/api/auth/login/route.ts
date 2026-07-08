import { NextResponse } from "next/server";

import { AUTH_COOKIE, AUTH_COOKIE_MAX_AGE, signSessionToken } from "@/lib/auth";
import type { Perfil } from "@/lib/auth";
import { generateSessionToken, verifyPassword } from "@/lib/password";
import { supabaseAdmin } from "@/lib/supabase";

interface UsuarioRow {
  id: string;
  nome: string;
  email: string;
  senha_hash: string;
  perfil: Perfil;
  ativo: boolean;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const senha = typeof body?.senha === "string" ? body.senha : "";

  if (!email || !senha) {
    return NextResponse.json(
      { error: "Email e senha são obrigatórios" },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("id, nome, email, senha_hash, perfil, ativo")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = usuario as unknown as UsuarioRow | null;

  if (!row || !row.ativo || !(await verifyPassword(senha, row.senha_hash))) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const sessao = generateSessionToken();

  const { error: updateError } = await supabase
    .from("usuarios")
    .update({ ultimo_acesso: new Date().toISOString(), sessao_token: sessao })
    .eq("id", row.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const token = await signSessionToken({
    id: row.id,
    email: row.email,
    nome: row.nome,
    perfil: row.perfil,
    sessao,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}
