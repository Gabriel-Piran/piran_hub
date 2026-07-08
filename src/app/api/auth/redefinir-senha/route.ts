import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/password";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const codigo = typeof body?.codigo === "string" ? body.codigo.trim() : "";
  const novaSenha = typeof body?.novaSenha === "string" ? body.novaSenha : "";

  if (!codigo || !novaSenha) {
    return NextResponse.json(
      { error: "Código e nova senha são obrigatórios" },
      { status: 400 }
    );
  }

  if (novaSenha.length < 6) {
    return NextResponse.json(
      { error: "A nova senha deve ter no mínimo 6 caracteres" },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, reset_token, reset_token_expiry")
    .eq("reset_token", codigo)
    .maybeSingle();

  const expiraEm = usuario?.reset_token_expiry
    ? new Date(usuario.reset_token_expiry).getTime()
    : 0;

  if (!usuario || expiraEm < Date.now()) {
    return NextResponse.json(
      { error: "Código inválido ou expirado" },
      { status: 400 }
    );
  }

  const senhaHash = await hashPassword(novaSenha);

  const { error } = await supabase
    .from("usuarios")
    .update({
      senha_hash: senhaHash,
      reset_token: null,
      reset_token_expiry: null,
      sessao_token: null,
    })
    .eq("id", usuario.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
