import { NextResponse } from "next/server";

import { PERFIS } from "@/lib/auth";
import type { Perfil } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { supabaseAdmin } from "@/lib/supabase";

const USUARIO_COLUMNS = "id, nome, email, perfil, ativo, criado_em, ultimo_acesso";
const USUARIO_COLUMNS_COM_DEPARTAMENTOS = `${USUARIO_COLUMNS}, usuarios_departamentos(departamento_id)`;

function isAdmin(request: Request) {
  return request.headers.get("x-user-perfil") === "admin";
}

export async function GET(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("usuarios")
    .select(USUARIO_COLUMNS_COM_DEPARTAMENTOS)
    .order("nome", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const usuarios = (data ?? []).map((u) => ({
    ...u,
    departamento_ids: (u.usuarios_departamentos ?? []).map(
      (d: { departamento_id: string }) => d.departamento_id
    ),
    usuarios_departamentos: undefined,
  }));

  return NextResponse.json(usuarios);
}

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const senha = typeof body?.senha === "string" ? body.senha : "";
  const perfil = body?.perfil as Perfil;

  if (!nome || !email || !senha || !PERFIS.includes(perfil)) {
    return NextResponse.json(
      { error: "nome, email, senha e perfil válido são obrigatórios" },
      { status: 400 }
    );
  }

  if (senha.length < 6) {
    return NextResponse.json(
      { error: "A senha deve ter no mínimo 6 caracteres" },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();
  const senhaHash = await hashPassword(senha);

  const { data, error } = await supabase
    .from("usuarios")
    .insert({ nome, email, senha_hash: senhaHash, perfil })
    .select(USUARIO_COLUMNS)
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    const message = error.code === "23505" ? "Já existe um usuário com esse email" : error.message;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json(data, { status: 201 });
}
