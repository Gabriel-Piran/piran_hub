import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { zapiConfig } from "@/lib/zapi";

export async function GET(request: Request) {
  // Check CRON_SECRET if configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const clientSecret = request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret");
    if (clientSecret !== cronSecret) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  const supabase = supabaseAdmin();
  const zapi = zapiConfig();

  if (!zapi) {
    return NextResponse.json({ error: "Z-API não configurada" }, { status: 500 });
  }

  // Fetch pending items
  const { data: items, error: itemsError } = await supabase
    .from("followup_fila")
    .select("*, leads(numero_whatsapp)")
    .eq("status", "pendente")
    .lte("agendado_para", new Date().toISOString())
    .lt("tentativas", 3)
    .limit(10);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const enviados: any[] = [];

  for (const item of items ?? []) {
    const leadInfo = Array.isArray(item.leads) ? item.leads[0] : item.leads;
    const phone = leadInfo?.numero_whatsapp;

    if (!phone) {
      await supabase
        .from("followup_fila")
        .update({
          status: "erro",
          erro_mensagem: "Lead sem número de WhatsApp",
          tentativas: item.tentativas + 1,
        })
        .eq("id", item.id);
      continue;
    }

    let zapiPath = "send-text";
    let zapiBody: any = { phone };

    if (item.tipo === "audio" && item.midia_url) {
      zapiPath = "send-audio";
      zapiBody.audio = item.midia_url;
      zapiBody.extension = "ogg";
    } else if (item.tipo === "imagem" && item.midia_url) {
      zapiPath = "send-image";
      zapiBody.image = item.midia_url;
      zapiBody.caption = item.mensagem_texto || "";
    } else if (item.tipo === "video" && item.midia_url) {
      zapiPath = "send-video";
      zapiBody.video = item.midia_url;
      zapiBody.caption = item.mensagem_texto || "";
    } else if (item.tipo === "documento" && item.midia_url) {
      zapiPath = "send-document";
      zapiBody.document = item.midia_url;
      zapiBody.fileName = "Documento";
    } else {
      zapiPath = "send-text";
      zapiBody.message = item.mensagem_texto || "";
    }

    try {
      const zapiRes = await fetch(`${zapi.baseUrl}/${zapiPath}`, {
        method: "POST",
        headers: zapi.headers,
        body: JSON.stringify(zapiBody),
      });

      if (zapiRes.ok) {
        const now = new Date().toISOString();

        // 1. Update queue item to 'enviado'
        await supabase
          .from("followup_fila")
          .update({
            status: "enviado",
            enviado_em: now,
            tentativas: item.tentativas + 1,
          })
          .eq("id", item.id);

        // 2. Mark as sent in followups_enviados (idempotency)
        await supabase
          .from("followups_enviados")
          .upsert({
            lead_id: item.lead_id,
            regra_id: item.regra_id,
            enviado_em: now,
          }, {
            onConflict: "lead_id,regra_id"
          });

        // 3. Save message log in messages table
        let conteudo = item.mensagem_texto || "";
        if (item.tipo === "audio") conteudo = "[Áudio]";
        else if (item.tipo !== "texto" && item.midia_url) {
          conteudo = item.midia_url.split("/").pop() || "Arquivo";
        }

        await supabase
          .from("mensagens")
          .insert({
            lead_id: item.lead_id,
            conteudo,
            role: "sistema",
            tipo: item.tipo === "documento" ? "documento" : (item.tipo === "imagem" ? "imagem" : (item.tipo === "audio" ? "audio" : "texto")),
            midia_url: item.midia_url || null,
            enviado_em: now,
          });

        enviados.push({ id: item.id, lead_id: item.lead_id, status: "enviado" });
      } else {
        const errText = await zapiRes.text().catch(() => "");
        const novasTentativas = item.tentativas + 1;
        const novoStatus = novasTentativas >= 3 ? "erro" : "pendente";

        await supabase
          .from("followup_fila")
          .update({
            status: novoStatus,
            tentativas: novasTentativas,
            erro_mensagem: `Z-API returned ${zapiRes.status}: ${errText}`,
          })
          .eq("id", item.id);
      }
    } catch (err: any) {
      const novasTentativas = item.tentativas + 1;
      const novoStatus = novasTentativas >= 3 ? "erro" : "pendente";

      await supabase
        .from("followup_fila")
        .update({
          status: novoStatus,
          tentativas: novasTentativas,
          erro_mensagem: err.message || "Erro de conexão",
        })
        .eq("id", item.id);
    }
  }

  return NextResponse.json({ enviados });
}
