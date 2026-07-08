export async function sendResetCodeEmail(to: string, codigo: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurada");
  }

  const from = process.env.RESEND_FROM_EMAIL ?? "Piran Hub <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Código de recuperação - Piran Hub",
      html: `<p>Seu código de recuperação é: <strong>${codigo}</strong>.</p><p>Válido por 15 minutos.</p>`,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Falha ao enviar email via Resend: ${errText || res.status}`);
  }
}
