import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { calcularFollowupsPrevistos } from "@/lib/followup-scheduler";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const regraId = searchParams.get("regra_id");
  const data = searchParams.get("data");

  const supabase = supabaseAdmin();

  let query = supabase
    .from("followup_fila")
    .select(`
      *,
      leads (
        nome,
        numero_whatsapp
      ),
      followup_regras (
        nome
      )
    `);

  if (status && status !== "todos" && status !== "previsto") {
    query = query.eq("status", status);
  }
  if (regraId && regraId !== "todos") {
    query = query.eq("regra_id", regraId);
  }

  if (data) {
    try {
      const startOfDay = new Date(data);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(data);
      endOfDay.setHours(23, 59, 59, 999);

      query = query
        .gte("agendado_para", startOfDay.toISOString())
        .lte("agendado_para", endOfDay.toISOString());
    } catch {
      // ignore invalid date
    }
  }

  const items: any[] = [];

  if (!status || status === "todos" || status === "previsto") {
    const previstos = await calcularFollowupsPrevistos();
    for (const p of previstos) {
      if (regraId && regraId !== "todos" && p.regra_id !== regraId) continue;
      if (data) {
        const dia = p.previsto_para.slice(0, 10);
        if (dia !== data) continue;
      }
      items.push({
        id: `previsto:${p.lead_id}:${p.regra_id}`,
        lead_id: p.lead_id,
        regra_id: p.regra_id,
        agendado_para: p.previsto_para,
        status: "previsto",
        leads: { nome: p.lead_nome, numero_whatsapp: p.lead_numero_whatsapp },
        followup_regras: { nome: p.regra_nome },
      });
    }
  }

  if (status !== "previsto") {
    const { data: queue, error } = await query.order("agendado_para", { ascending: true });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    items.push(...(queue ?? []));
  }

  items.sort((a, b) => (a.agendado_para || "").localeCompare(b.agendado_para || ""));

  return NextResponse.json(items);
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const id = body?.id;
    const acao = body?.acao; // 'cancelar' | 'reagendar'

    if (!id || !acao) {
      return NextResponse.json({ error: "id e acao são obrigatórios" }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    if (acao === "cancelar") {
      const { data, error } = await supabase
        .from("followup_fila")
        .update({ status: "cancelado" })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data) {
        return NextResponse.json({ error: "Item da fila não encontrado" }, { status: 404 });
      }
      return NextResponse.json(data);
    }

    if (acao === "reagendar") {
      const { data, error } = await supabase
        .from("followup_fila")
        .update({
          status: "pendente",
          tentativas: 0,
          erro_mensagem: null,
          agendado_para: new Date().toISOString() // queue for immediate retry
        })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data) {
        return NextResponse.json({ error: "Item da fila não encontrado" }, { status: 404 });
      }
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
