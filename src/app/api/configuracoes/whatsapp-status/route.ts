import { NextResponse } from "next/server";

import { zapiConfig } from "@/lib/zapi";

export async function GET() {
  const zapi = zapiConfig();
  if (!zapi) {
    return NextResponse.json({ error: "Z-API não configurada" }, { status: 500 });
  }

  try {
    const res = await fetch(`${zapi.baseUrl}/status`, {
      headers: zapi.headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ connected: false }, { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ connected: false }, { status: 200 });
  }
}
