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
    const leadId = body?.lead_id;
    const regraId = body?.regra_id;

    if (!id && !(leadId && regraId)) {
      return NextResponse.json(
        { error: "informe id, ou lead_id + regra_id para cancelar um previsto" },
        { status: 400 }
      );
    }
    if (!acao) {
      return NextResponse.json({ error: "acao é obrigatória" }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    // Cancela um item "previsto" (ainda sem linha real em followup_fila) —
    // grava uma linha-marcador com status "cancelado" pra esse lead+regra
    // nunca serem enfileirados de verdade, já que a elegibilidade real
    // (agendarFollowupsParaRegra/calcularFollowupsPrevistos) passa a
    // excluir quem já tem uma linha "cancelado".
    if (!id && leadId && regraId && acao === "cancelar") {
      const { data: regra } = await supabase
        .from("followup_regras")
        .select("*, mensagens_rapidas(*)")
        .eq("id", regraId)
        .maybeSingle();

      if (!regra) {
        return NextResponse.json({ error: "Regra não encontrada" }, { status: 404 });
      }

      let texto = regra.mensagem_texto || "";
      let midiaUrl: string | null = null;
      let tipo = "texto";
      if (regra.mensagens_rapidas) {
        texto = regra.mensagens_rapidas.conteudo || "";
        midiaUrl = regra.mensagens_rapidas.midia_url || null;
        tipo = regra.mensagens_rapidas.tipo || "texto";
      }

      const { data, error } = await supabase
        .from("followup_fila")
        .insert({
          lead_id: leadId,
          regra_id: regraId,
          mensagem_texto: texto,
          midia_url: midiaUrl,
          tipo,
          agendado_para: new Date().toISOString(),
          status: "cancelado",
          tentativas: 0,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    }

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
