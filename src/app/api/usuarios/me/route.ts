import { NextResponse } from "next/server";

import { hashPassword, verifyPassword } from "@/lib/password";
import { supabaseAdmin } from "@/lib/supabase";

const USUARIO_COLUMNS = "id, nome, email, perfil, ativo, criado_em, ultimo_acesso";

export async function GET(request: Request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("usuarios")
    .select(USUARIO_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const updates: Record<string, unknown> = {};

  if ("nome" in body) updates.nome = String(body.nome).trim();
  if ("email" in body) updates.email = String(body.email).trim().toLowerCase();

  if ("novaSenha" in body && body.novaSenha) {
    const senhaAtual = typeof body.senhaAtual === "string" ? body.senhaAtual : "";
    const novaSenha = String(body.novaSenha);

    if (!senhaAtual) {
      return NextResponse.json(
        { error: "Informe a senha atual para trocar a senha" },
        { status: 400 }
      );
    }
    if (novaSenha.length < 6) {
      return NextResponse.json(
        { error: "A nova senha deve ter no mínimo 6 caracteres" },
        { status: 400 }
      );
    }

    const { data: usuario, error: fetchError } = await supabase
      .from("usuarios")
      .select("senha_hash")
      .eq("id", userId)
      .single();

    if (fetchError || !usuario || !(await verifyPassword(senhaAtual, usuario.senha_hash))) {
      return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 });
    }

    updates.senha_hash = await hashPassword(novaSenha);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("usuarios")
    .update(updates)
    .eq("id", userId)
    .select(USUARIO_COLUMNS)
    .maybeSingle();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    const message = error.code === "23505" ? "Já existe um usuário com esse email" : error.message;
    return NextResponse.json({ error: message }, { status });
  }

  if (!data) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  return NextResponse.json(data);
}
