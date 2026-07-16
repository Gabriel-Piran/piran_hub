import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { gerarContrato } from "@/lib/contratos";
import { restartLeadAtendimento } from "@/lib/leads-restart";
import { zapiConfig, type ZapiInstancia } from "@/lib/zapi";

const LEAD_COLUMNS =
  "id, nome, numero_whatsapp, instancia, estagio, status, departamento_id, salario, cpf, data_nascimento, nome_mae, logradouro, numero_end, bairro, cidade, estado, cep";

async function notificar(
  supabase: ReturnType<typeof supabaseAdmin>,
  leadId: string,
  conteudo: string
) {
  await supabase.from("mensagens").insert({
    lead_id: leadId,
    conteudo,
    role: "sistema",
    tipo: "texto",
    enviado_em: new Date().toISOString(),
    enviado_por_atendente: true,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const acaoId = typeof body?.acao_id === "string" ? body.acao_id : "";
  const leadId = typeof body?.lead_id === "string" ? body.lead_id : "";

  if (!acaoId || !leadId) {
    return NextResponse.json({ error: "acao_id e lead_id são obrigatórios" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const { data: acao, error: acaoError } = await supabase
    .from("acoes")
    .select("id, nome, slug, tipo, configuracao, ativo")
    .eq("id", acaoId)
    .maybeSingle();

  if (acaoError) {
    return NextResponse.json({ error: acaoError.message }, { status: 500 });
  }
  if (!acao || !acao.ativo) {
    return NextResponse.json({ error: "Ação não encontrada ou inativa" }, { status: 404 });
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 });
  }
  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
  }

  const configuracao = (acao.configuracao ?? {}) as Record<string, unknown>;

  // "Reiniciar Atendimento" zera o histórico e volta ao início, independente
  // do tipo cadastrado (a ação é identificada pelo slug, não pelo tipo, pois
  // 'restart' não é um valor válido de `acoes.tipo`).
  if (acao.slug === "restart") {
    const resultado = await restartLeadAtendimento(supabase, leadId);
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status });
    }
    return NextResponse.json({ ok: true, acao: acao.slug, resultado: resultado.lead });
  }

  switch (acao.tipo) {
    case "transferir": {
      const { error } = await supabase
        .from("leads")
        .update({ modo_atendimento: "humano", atualizado_em: new Date().toISOString() })
        .eq("id", leadId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await notificar(supabase, leadId, `Atendimento transferido para humano (${acao.nome}).`);
      return NextResponse.json({ ok: true, acao: acao.slug });
    }

    case "arquivar": {
      const { error } = await supabase
        .from("leads")
        .update({ status: "arquivado", atualizado_em: new Date().toISOString() })
        .eq("id", leadId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await notificar(supabase, leadId, `Conversa arquivada (${acao.nome}).`);
      return NextResponse.json({ ok: true, acao: acao.slug });
    }

    case "estagio": {
      const estagio = configuracao.estagio;
      if (typeof estagio !== "string" || !estagio) {
        return NextResponse.json(
          { error: "Ação sem configuracao.estagio válida" },
          { status: 400 }
        );
      }
      const { error } = await supabase
        .from("leads")
        .update({ estagio, atualizado_em: new Date().toISOString() })
        .eq("id", leadId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await notificar(supabase, leadId, `Estágio alterado para ${estagio} (${acao.nome}).`);
      return NextResponse.json({ ok: true, acao: acao.slug });
    }

    case "status": {
      const status = configuracao.status;
      if (typeof status !== "string" || !status) {
        return NextResponse.json(
          { error: "Ação sem configuracao.status válida" },
          { status: 400 }
        );
      }
      const { error } = await supabase
        .from("leads")
        .update({ status, atualizado_em: new Date().toISOString() })
        .eq("id", leadId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await notificar(supabase, leadId, `Status alterado para ${status} (${acao.nome}).`);
      return NextResponse.json({ ok: true, acao: acao.slug });
    }

    case "contrato": {
      const resultado = await gerarContrato(leadId);
      if (!resultado.ok) {
        return NextResponse.json(
          { error: resultado.error, detalhe: resultado.resultado },
          { status: resultado.status }
        );
      }
      await notificar(supabase, leadId, `Geração de contrato acionada (${acao.nome}).`);
      return NextResponse.json({ ok: true, acao: acao.slug, resultado: resultado.resultado });
    }

    case "mensagem": {
      const texto =
        typeof configuracao.mensagem === "string"
          ? configuracao.mensagem
          : typeof configuracao.texto === "string"
            ? configuracao.texto
            : "";
      if (!texto) {
        return NextResponse.json(
          { error: "Ação sem configuracao.mensagem válida" },
          { status: 400 }
        );
      }

      const zapi = zapiConfig(lead.instancia as ZapiInstancia);
      if (!zapi) {
        return NextResponse.json({ error: "Z-API não configurada" }, { status: 500 });
      }

      const zapiRes = await fetch(`${zapi.baseUrl}/send-text`, {
        method: "POST",
        headers: zapi.headers,
        body: JSON.stringify({ phone: lead.numero_whatsapp, message: texto }),
      });

      if (!zapiRes.ok) {
        const errText = await zapiRes.text().catch(() => "");
        return NextResponse.json(
          { error: `Falha ao enviar via Z-API: ${errText || zapiRes.status}` },
          { status: 502 }
        );
      }

      await notificar(supabase, leadId, texto);
      return NextResponse.json({ ok: true, acao: acao.slug });
    }

    case "webhook": {
      const url = configuracao.url;
      if (typeof url !== "string" || !url) {
        return NextResponse.json(
          { error: "Ação sem configuracao.url válida" },
          { status: 400 }
        );
      }

      const webhookRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          numero_whatsapp: lead.numero_whatsapp,
          estagio: lead.estagio,
          status: lead.status,
          nome: lead.nome,
          dados: {
            cpf: lead.cpf,
            salario: lead.salario,
            data_nascimento: lead.data_nascimento,
            nome_mae: lead.nome_mae,
            logradouro: lead.logradouro,
            numero_end: lead.numero_end,
            bairro: lead.bairro,
            cidade: lead.cidade,
            estado: lead.estado,
            cep: lead.cep,
          },
        }),
      });

      if (!webhookRes.ok) {
        const errText = await webhookRes.text().catch(() => "");
        return NextResponse.json(
          { error: `Falha ao chamar webhook: ${errText || webhookRes.status}` },
          { status: 502 }
        );
      }

      await notificar(supabase, leadId, `Webhook acionado (${acao.nome}).`);
      return NextResponse.json({ ok: true, acao: acao.slug });
    }

    default:
      return NextResponse.json({ error: "Tipo de ação não suportado" }, { status: 400 });
  }
}
