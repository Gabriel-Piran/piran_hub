import { NextResponse } from "next/server";

import { processarMensagensAgendadas } from "@/lib/mensagensAgendadas";

export async function POST() {
  try {
    const { enviadas, erros } = await processarMensagensAgendadas();
    return NextResponse.json({ enviadas, erros });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
