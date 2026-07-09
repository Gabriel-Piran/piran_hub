import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { scheduleFollowups } from "@/lib/followup-scheduler";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const regraId = body?.regra_id;

    if (!regraId) {
      return NextResponse.json({ error: "regra_id é obrigatório" }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    // Fetch rule
    const { data: regra, error: regraError } = await supabase
      .from("followup_regras")
      .select("*")
      .eq("id", regraId)
      .single();

    if (regraError || !regra) {
      return NextResponse.json({ error: "Regra não encontrada" }, { status: 404 });
    }

    // Calculate limit date
    const limite = new Date();
    limite.setDate(limite.getDate() - regra.dias_espera);

    // Fetch leads in this stage
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id")
      .eq("estagio", regra.estagio_gatilho)
      .lte("atualizado_em", limite.toISOString())
      .eq("status", "ativo");

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ agendados: 0 });
    }

    // Fetch sent follow-ups for this rule
    const { data: sent } = await supabase
      .from("followups_enviados")
      .select("lead_id")
      .eq("regra_id", regraId);
    const sentLeadIds = new Set((sent ?? []).map(s => s.lead_id));

    // Fetch queued/pending or sent in followup_fila
    const { data: queued } = await supabase
      .from("followup_fila")
      .select("lead_id")
      .eq("regra_id", regraId)
      .in("status", ["pendente", "enviado"]);
    const queuedLeadIds = new Set((queued ?? []).map(q => q.lead_id));

    // Filter eligible lead IDs
    const eligibleLeadIds = leads
      .map(l => l.id)
      .filter(id => !sentLeadIds.has(id) && !queuedLeadIds.has(id));

    if (eligibleLeadIds.length === 0) {
      return NextResponse.json({ agendados: 0 });
    }

    // Call scheduleFollowups
    const agendadosCount = await scheduleFollowups(eligibleLeadIds, regraId);

    return NextResponse.json({ agendados: agendadosCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
