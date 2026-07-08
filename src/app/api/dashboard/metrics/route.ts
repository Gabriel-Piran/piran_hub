import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import type { MetricasCard } from "@/types";

function startOfTodayISO() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function sevenDaysAgoISO() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

export async function GET() {
  const supabase = supabaseAdmin();

  const [totalHoje, ultimos7, naoDesqualificados7, contratosEnviados, aguardando] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .gte("criado_em", startOfTodayISO()),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .gte("criado_em", sevenDaysAgoISO()),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .gte("criado_em", sevenDaysAgoISO())
        .neq("status", "desqualificado"),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .in("status", ["contrato_enviado", "contrato_assinado"]),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "contrato_enviado"),
    ]);

  const firstError = [
    totalHoje,
    ultimos7,
    naoDesqualificados7,
    contratosEnviados,
    aguardando,
  ].find((r) => r.error)?.error;

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const totalLeadsHoje = totalHoje.count ?? 0;
  const base7 = ultimos7.count ?? 0;
  const qualificados7 = naoDesqualificados7.count ?? 0;
  const taxaQualificacao = base7 > 0 ? Math.round((qualificados7 / base7) * 100) : 0;

  const metrics: MetricasCard[] = [
    { id: "leads-hoje", titulo: "Total Leads Hoje", valor: String(totalLeadsHoje) },
    {
      id: "qualificacao",
      titulo: "Taxa de Qualificação",
      valor: `${taxaQualificacao}%`,
    },
    {
      id: "contratos-enviados",
      titulo: "Contratos Enviados",
      valor: String(contratosEnviados.count ?? 0),
    },
    {
      id: "aguardando",
      titulo: "Aguardando Assinatura",
      valor: String(aguardando.count ?? 0),
    },
  ];

  return NextResponse.json(metrics);
}
