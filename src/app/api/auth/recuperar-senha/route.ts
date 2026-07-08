import { NextResponse } from "next/server";

import { sendResetCodeEmail } from "@/lib/email";
import { generateResetCode } from "@/lib/password";
import { supabaseAdmin } from "@/lib/supabase";

const CODE_TTL_MINUTES = 15;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email) {
    return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, email, ativo")
    .eq("email", email)
    .maybeSingle();

  // Resposta genérica sempre, para não revelar se o email existe na base.
  if (usuario && usuario.ativo) {
    const codigo = generateResetCode();
    const expiry = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();

    await supabase
      .from("usuarios")
      .update({ reset_token: codigo, reset_token_expiry: expiry })
      .eq("id", usuario.id);

    try {
      await sendResetCodeEmail(usuario.email, codigo);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Falha ao enviar email" },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Se o email existir, um código foi enviado.",
  });
}
