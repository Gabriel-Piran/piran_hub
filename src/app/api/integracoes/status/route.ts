import { NextResponse } from "next/server";

import { zapiConfig } from "@/lib/zapi";
import type { ZapiInstancia } from "@/lib/zapi";

const INSTANCIAS: ZapiInstancia[] = ["ads", "indicacoes"];

async function fetchStatus(instancia: ZapiInstancia) {
  const zapi = zapiConfig(instancia);
  if (!zapi) return { instancia, connected: false, configured: false };

  try {
    const res = await fetch(`${zapi.baseUrl}/status`, {
      headers: zapi.headers,
      cache: "no-store",
    });
    if (!res.ok) return { instancia, connected: false, configured: true };
    const data = await res.json();
    return { instancia, connected: Boolean(data?.connected), configured: true };
  } catch {
    return { instancia, connected: false, configured: true };
  }
}

export async function GET() {
  const resultados = await Promise.all(INSTANCIAS.map(fetchStatus));
  return NextResponse.json(
    Object.fromEntries(resultados.map((r) => [r.instancia, r]))
  );
}
