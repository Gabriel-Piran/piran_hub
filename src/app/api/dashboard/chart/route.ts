import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import type { ChartPoint } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.max(1, Math.min(90, Number(searchParams.get("days")) || 7));

  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("leads")
    .select("criado_em, status")
    .gte("criado_em", since.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const buckets = new Map<string, ChartPoint>();
  for (let i = 0; i < days; i++) {
    const date = new Date(since);
    date.setDate(date.getDate() + i);
    const key = date.toISOString().slice(0, 10);
    buckets.set(key, { data: key, recebidos: 0, qualificados: 0, contratos: 0 });
  }

  for (const row of (data ?? []) as { criado_em: string; status: string }[]) {
    const key = row.criado_em.slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.recebidos += 1;
    if (row.status !== "desqualificado") bucket.qualificados += 1;
    if (row.status === "contrato_enviado" || row.status === "contrato_assinado") {
      bucket.contratos += 1;
    }
  }

  return NextResponse.json(Array.from(buckets.values()));
}
