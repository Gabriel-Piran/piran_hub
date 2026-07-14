import { NextResponse } from "next/server";
import { agendarFollowupsParaRegra } from "@/lib/followup-scheduler";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const regraId = body?.regra_id;

    if (!regraId) {
      return NextResponse.json({ error: "regra_id é obrigatório" }, { status: 400 });
    }

    const agendadosCount = await agendarFollowupsParaRegra(regraId);
    return NextResponse.json({ agendados: agendadosCount });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
