import { NextResponse } from "next/server";

import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${AUTH_COOKIE}=`));

  const token = match?.slice(AUTH_COOKIE.length + 1);
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("id, nome, email, perfil, ativo, ultimo_acesso, sessao_token")
    .eq("id", session.id)
    .maybeSingle();

  if (
    error ||
    !usuario ||
    !usuario.ativo ||
    usuario.sessao_token !== session.sessao
  ) {
    return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
  }

  return NextResponse.json({
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    ultimoAcesso: usuario.ultimo_acesso,
  });
}
