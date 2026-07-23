import type { SupabaseClient } from "@supabase/supabase-js";

import { gerarContrato } from "@/lib/contratos";
import { restartLeadAtendimento } from "@/lib/leads-restart";
import { zapiConfig, type ZapiInstancia } from "@/lib/zapi";

const LEAD_COLUMNS =
  "id, nome, numero_whatsapp, instancia, estagio, status, departamento_id, salario, cpf, data_nascimento, nome_mae, logradouro, numero_end, bairro, cidade, estado, cep";

export interface ExecutarAcaoResultado {
  ok: boolean;
  status: number;
  error?: string;
  acao?: string;
  resultado?: unknown;
}

async function notificar(supabase: SupabaseClient, leadId: string, conteudo: string) {
  await supabase.from("mensagens").insert({
    lead_id: leadId,
    conteudo,
    role: "sistema",
    tipo: "texto",
    enviado_em: new Date().toISOString(),
    enviado_por_atendente: true,
  });
}

export async function executarAcao(
  supabase: SupabaseClient,
  acaoId: string,
  leadId: string
): Promise<ExecutarAcaoResultado> {
  const { data: acao, error: acaoError } = await supabase
    .from("acoes")
    .select("id, nome, slug, tipo, configuracao, ativo")
    .eq("id", acaoId)
    .maybeSingle();

  if (acaoError) {
    return { ok: false, status: 500, error: acaoError.message };
  }
  if (!acao || !acao.ativo) {
    return { ok: false, status: 404, error: "Ação não encontrada ou inativa" };
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) {
    return { ok: false, status: 500, error: leadError.message };
  }
  if (!lead) {
    return { ok: false, status: 404, error: "Lead não encontrado" };
  }

  const configuracao = (acao.configuracao ?? {}) as Record<string, unknown>;

  // "Reiniciar Atendimento" zera o histórico e volta ao início, independente
  // do tipo cadastrado (a ação é identificada pelo slug, não pelo tipo, pois
  // 'restart' não é um valor válido de `acoes.tipo`).
  if (acao.slug === "restart") {
    const resultado = await restartLeadAtendimento(supabase, leadId);
    if (!resultado.ok) {
      return { ok: false, status: resultado.status, error: resultado.error };
    }
    return { ok: true, status: 200, acao: acao.slug, resultado: resultado.lead };
  }

  switch (acao.tipo) {
    case "transferir": {
      const { error } = await supabase
        .from("leads")
        .update({ modo_atendimento: "humano", atualizado_em: new Date().toISOString() })
        .eq("id", leadId);
      if (error) return { ok: false, status: 500, error: error.message };

      await notificar(supabase, leadId, `Atendimento transferido para humano (${acao.nome}).`);
      return { ok: true, status: 200, acao: acao.slug };
    }

    case "arquivar": {
      const { error } = await supabase
        .from("leads")
        .update({ status: "arquivado", atualizado_em: new Date().toISOString() })
        .eq("id", leadId);
      if (error) return { ok: false, status: 500, error: error.message };

      await notificar(supabase, leadId, `Conversa arquivada (${acao.nome}).`);
      return { ok: true, status: 200, acao: acao.slug };
    }

    case "estagio": {
      const estagio = configuracao.estagio;
      if (typeof estagio !== "string" || !estagio) {
        return { ok: false, status: 400, error: "Ação sem configuracao.estagio válida" };
      }
      const { error } = await supabase
        .from("leads")
        .update({ estagio, atualizado_em: new Date().toISOString() })
        .eq("id", leadId);
      if (error) return { ok: false, status: 500, error: error.message };

      await notificar(supabase, leadId, `Estágio alterado para ${estagio} (${acao.nome}).`);
      return { ok: true, status: 200, acao: acao.slug };
    }

    case "status": {
      const status = configuracao.status;
      if (typeof status !== "string" || !status) {
        return { ok: false, status: 400, error: "Ação sem configuracao.status válida" };
      }
      const { error } = await supabase
        .from("leads")
        .update({ status, atualizado_em: new Date().toISOString() })
        .eq("id", leadId);
      if (error) return { ok: false, status: 500, error: error.message };

      await notificar(supabase, leadId, `Status alterado para ${status} (${acao.nome}).`);
      return { ok: true, status: 200, acao: acao.slug };
    }

    case "contrato": {
      const resultado = await gerarContrato(leadId);
      if (!resultado.ok) {
        return { ok: false, status: resultado.status, error: resultado.error, resultado: resultado.resultado };
      }
      await notificar(supabase, leadId, `Geração de contrato acionada (${acao.nome}).`);
      return { ok: true, status: 200, acao: acao.slug, resultado: resultado.resultado };
    }

    case "mensagem": {
      const texto =
        typeof configuracao.mensagem === "string"
          ? configuracao.mensagem
          : typeof configuracao.texto === "string"
            ? configuracao.texto
            : "";
      if (!texto) {
        return { ok: false, status: 400, error: "Ação sem configuracao.mensagem válida" };
      }

      const zapi = zapiConfig(lead.instancia as ZapiInstancia);
      if (!zapi) {
        return { ok: false, status: 500, error: "Z-API não configurada" };
      }

      const zapiRes = await fetch(`${zapi.baseUrl}/send-text`, {
        method: "POST",
        headers: zapi.headers,
        body: JSON.stringify({ phone: lead.numero_whatsapp, message: texto }),
      });

      if (!zapiRes.ok) {
        const errText = await zapiRes.text().catch(() => "");
        return { ok: false, status: 502, error: `Falha ao enviar via Z-API: ${errText || zapiRes.status}` };
      }

      await notificar(supabase, leadId, texto);
      return { ok: true, status: 200, acao: acao.slug };
    }

    case "webhook": {
      const url = configuracao.url;
      if (typeof url !== "string" || !url) {
        return { ok: false, status: 400, error: "Ação sem configuracao.url válida" };
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
        return { ok: false, status: 502, error: `Falha ao chamar webhook: ${errText || webhookRes.status}` };
      }

      await notificar(supabase, leadId, `Webhook acionado (${acao.nome}).`);
      return { ok: true, status: 200, acao: acao.slug };
    }

    default:
      return { ok: false, status: 400, error: "Tipo de ação não suportado" };
  }
}
