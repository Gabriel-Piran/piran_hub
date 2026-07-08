import { NextResponse } from "next/server";

import { PERFIS } from "@/lib/auth";
import type { Perfil } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { supabaseAdmin } from "@/lib/supabase";

const USUARIO_COLUMNS = "id, nome, email, perfil, ativo, criado_em, ultimo_acesso";

function isAdmin(request: Request) {
  return request.headers.get("x-user-perfil") === "admin";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if ("nome" in body) updates.nome = String(body.nome).trim();
  if ("email" in body) updates.email = String(body.email).trim().toLowerCase();
  if ("ativo" in body) updates.ativo = Boolean(body.ativo);
  if ("perfil" in body) {
    const perfil = body.perfil as Perfil;
    if (!PERFIS.includes(perfil)) {
      return NextResponse.json({ error: "Perfil inválido" }, { status: 400 });
    }
    updates.perfil = perfil;
  }
  if ("senha" in body && body.senha) {
    if (String(body.senha).length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 6 caracteres" },
        { status: 400 }
      );
    }
    updates.senha_hash = await hashPassword(String(body.senha));
    updates.sessao_token = null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("usuarios")
    .update(updates)
    .eq("id", id)
    .select(USUARIO_COLUMNS)
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    const message = error.code === "23505" ? "Já existe um usuário com esse email" : error.message;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  if (id === request.headers.get("x-user-id")) {
    return NextResponse.json(
      { error: "Você não pode excluir o próprio usuário" },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("usuarios").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
