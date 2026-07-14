import { NextResponse } from "next/server";

import { zapiConfig } from "@/lib/zapi";
import type { ZapiInstancia } from "@/lib/zapi";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ instancia: string }> }
) {
  const { instancia } = await params;
  if (instancia !== "ads" && instancia !== "indicacoes") {
    return NextResponse.json({ error: "Instância inválida" }, { status: 400 });
  }

  const zapi = zapiConfig(instancia as ZapiInstancia);
  if (!zapi) {
    return NextResponse.json({ error: "Z-API não configurada" }, { status: 500 });
  }

  try {
    const res = await fetch(`${zapi.baseUrl}/connect`, {
      headers: zapi.headers,
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json({ ok: res.ok, ...data });
  } catch {
    return NextResponse.json({ error: "Falha ao conectar com a Z-API" }, { status: 502 });
  }
}
