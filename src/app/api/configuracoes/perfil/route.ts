import { NextResponse } from "next/server";

import { readConfig, writeConfig } from "@/lib/config-store";

export async function GET() {
  const config = await readConfig();
  return NextResponse.json(config);
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const current = await readConfig();
  const updated = {
    ...current,
    ...body,
    notificacoes: { ...current.notificacoes, ...(body.notificacoes ?? {}) },
  };

  await writeConfig(updated);
  return NextResponse.json(updated);
}
