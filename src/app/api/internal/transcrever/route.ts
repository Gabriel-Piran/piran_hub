import { NextResponse } from "next/server";

import { transcreverAudio } from "@/lib/whisper";

export async function POST(request: Request) {
  const secret = process.env.INTERNAL_API_SECRET;
  const headerSecret = request.headers.get("x-internal-secret");

  if (!secret || headerSecret !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const url = body?.url;
  const leadId = body?.lead_id;

  if (!url || typeof url !== "string" || !leadId || typeof leadId !== "string") {
    return NextResponse.json(
      { error: "url e lead_id são obrigatórios" },
      { status: 400 }
    );
  }

  try {
    const transcricao = await transcreverAudio(url);
    return NextResponse.json({ transcricao });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
