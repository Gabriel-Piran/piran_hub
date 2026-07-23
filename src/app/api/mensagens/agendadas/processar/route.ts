import { NextResponse } from "next/server";

import { processarMensagensAgendadas } from "@/lib/mensagensAgendadas";
import { autorizadoCron } from "@/lib/cron";

export async function POST(request: Request) {
  if (!autorizadoCron(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { enviadas, erros } = await processarMensagensAgendadas();
    return NextResponse.json({ enviadas, erros });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
