import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { deletarLeadCompleto } from "@/lib/leads-restart";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = supabaseAdmin();

  const resultado = await deletarLeadCompleto(supabase, id);

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: resultado.status });
  }

  return NextResponse.json({ success: true, deletado: true });
}
