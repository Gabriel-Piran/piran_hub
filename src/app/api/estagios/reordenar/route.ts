import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const ids = body?.ids;

  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "ids deve ser uma lista de strings" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const results = await Promise.all(
    ids.map((id: string, index: number) =>
      supabase
        .from("estagios_customizados")
        .update({ ordem: index + 1 })
        .eq("id", id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
