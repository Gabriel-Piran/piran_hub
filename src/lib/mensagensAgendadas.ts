import { supabaseAdmin } from "@/lib/supabase";
import { zapiConfig, type ZapiInstancia } from "@/lib/zapi";

export interface MensagemAgendadaProcessada {
  mensagem_id: string;
  lead_id: string;
  numero_whatsapp: string;
  instancia: string;
  conteudo: string;
  tipo: string;
  status: "enviado" | "erro";
  erro?: string;
}

export async function processarMensagensAgendadas(): Promise<{
  itens: MensagemAgendadaProcessada[];
  enviadas: number;
  erros: number;
}> {
  const supabase = supabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("mensagens")
    .select("id, lead_id, conteudo, tipo, agendado_para, leads(numero_whatsapp, instancia)")
    .lte("agendado_para", now)
    .is("acao_executada", null);

  if (error) {
    throw new Error(error.message);
  }

  const pendentes = data ?? [];
  const itens: MensagemAgendadaProcessada[] = [];
  let enviadas = 0;
  let erros = 0;

  for (const m of pendentes) {
    const lead = Array.isArray(m.leads) ? m.leads[0] : m.leads;
    const numeroWhatsapp = lead?.numero_whatsapp ?? "";
    const instancia = lead?.instancia ?? "";

    let status: "enviado" | "erro" = "erro";
    let erroMsg: string | undefined;

    const zapi = zapiConfig(instancia as ZapiInstancia);

    if (!zapi || !numeroWhatsapp) {
      erroMsg = "Configuração Z-API ausente ou lead sem número de WhatsApp";
    } else {
      try {
        const zapiRes = await fetch(`${zapi.baseUrl}/send-text`, {
          method: "POST",
          headers: zapi.headers,
          body: JSON.stringify({ phone: numeroWhatsapp, message: m.conteudo }),
        });

        if (zapiRes.status === 200) {
          status = "enviado";
        } else {
          erroMsg = `Z-API retornou status ${zapiRes.status}: ${await zapiRes.text().catch(() => "")}`;
        }
      } catch (err) {
        erroMsg = (err as Error).message;
      }
    }

    await supabase
      .from("mensagens")
      .update({
        acao_executada: status,
        enviado_em_real: status === "enviado" ? now : null,
      })
      .eq("id", m.id);

    if (status === "enviado") {
      enviadas += 1;
    } else {
      erros += 1;
    }

    itens.push({
      mensagem_id: m.id,
      lead_id: m.lead_id,
      numero_whatsapp: numeroWhatsapp,
      instancia,
      conteudo: m.conteudo,
      tipo: m.tipo,
      status,
      erro: erroMsg,
    });
  }

  return { itens, enviadas, erros };
}
