import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { deletarLeadCompleto } from "@/lib/leads-restart";
import { executarAcao } from "@/lib/acoes";
import { encontrarAcaoPorRegra } from "@/lib/regras-condicionais";
import { ensureMidiasBucketPublico } from "@/lib/supabase-storage";

const N8N_WEBHOOK_URL = "https://n8n-production-d971c.up.railway.app/webhook/evolution-webhook";

function normalizarTelefone(phone: string): string {
  return phone.replace(/\D/g, "");
}

const MIDIA_CAMPOS = [
  { campo: "image", campoUrl: "imageUrl", pasta: "imagens" },
  { campo: "audio", campoUrl: "audioUrl", pasta: "audios" },
  { campo: "video", campoUrl: "videoUrl", pasta: "videos" },
  { campo: "document", campoUrl: "documentUrl", pasta: "documentos" },
] as const;

async function reenviarParaStorage(
  supabase: ReturnType<typeof supabaseAdmin>,
  phone: string,
  url: string,
  mimeType: string,
  pasta: string
): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = mimeType.split("/")[1]?.split(";")[0]?.trim() || "bin";
    const path = `${pasta}/recebidos/${phone}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("midias").upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
    });
    if (error) return null;

    return supabase.storage.from("midias").getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

/**
 * As URLs de mídia recebida que a Z-API manda no webhook (image.imageUrl,
 * audio.audioUrl, video.videoUrl, document.documentUrl) apontam para o
 * storage temporário da própria Z-API. O fluxo do n8n grava essa URL direto
 * em midia_url; quando ela falha ao ser buscada, a mensagem vira um
 * placeholder de texto (ex.: "[imagem]") em vez da mídia real. Baixamos
 * aqui e resubimos para o nosso Storage público antes de repassar ao n8n,
 * para que o link que ele grava seja sempre estável e acessível.
 */
async function resolverMidiasRecebidas(body: Record<string, unknown>, phone: string) {
  if (!phone) return;

  const presentes = MIDIA_CAMPOS.filter(({ campo, campoUrl }) => {
    const obj = body[campo] as Record<string, unknown> | undefined;
    return obj && typeof obj[campoUrl] === "string" && obj[campoUrl];
  });

  if (presentes.length === 0) return;

  const supabase = supabaseAdmin();
  await ensureMidiasBucketPublico(supabase);

  for (const { campo, campoUrl, pasta } of presentes) {
    const obj = body[campo] as Record<string, unknown>;
    const urlOriginal = obj[campoUrl] as string;
    const mimeType = typeof obj.mimeType === "string" ? obj.mimeType : "application/octet-stream";

    const urlNova = await reenviarParaStorage(supabase, phone, urlOriginal, mimeType, pasta);
    if (urlNova) {
      obj[campoUrl] = urlNova;
    }
  }
}

async function atualizarModoAtendimento(phone: string, modo: "humano" | "ia") {
  const supabase = supabaseAdmin();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id")
    .eq("numero_whatsapp", normalizarTelefone(phone))
    .maybeSingle();

  if (leadError || !lead) return false;

  const { error } = await supabase
    .from("leads")
    .update({ modo_atendimento: modo, atualizado_em: new Date().toISOString() })
    .eq("id", lead.id);

  return !error;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  if (body.fromMe === true) {
    return NextResponse.json({ ok: true });
  }

  const messageId = typeof body.messageId === "string" ? body.messageId : undefined;
  if (messageId) {
    const supabase = supabaseAdmin();
    const { error: dedupError } = await supabase
      .from("webhook_zapi_eventos")
      .insert({ message_id: messageId });

    if (dedupError) {
      // 23505 = unique_violation: já processamos este messageId (retry da
      // Z-API) — não repassa de novo para o n8n.
      if (dedupError.code === "23505") {
        return NextResponse.json({ ok: true, duplicado: true });
      }
      return NextResponse.json({ error: dedupError.message }, { status: 500 });
    }
  }

  const texto = (body.text?.message ?? "").trim().toLowerCase();
  const phone = typeof body.phone === "string" ? normalizarTelefone(body.phone) : "";

  await resolverMidiasRecebidas(body, phone).catch(() => null);

  if (texto === "/restart") {
    let executado = false;
    if (phone) {
      const supabase = supabaseAdmin();
      const { data: lead } = await supabase
        .from("leads")
        .select("id")
        .eq("numero_whatsapp", phone)
        .maybeSingle();

      if (lead) {
        const resultado = await deletarLeadCompleto(supabase, lead.id);
        executado = resultado.ok;
      }
    }
    return NextResponse.json({ comando: "restart", executado });
  }

  if (texto === "/parar") {
    const executado = phone ? await atualizarModoAtendimento(phone, "humano") : false;
    return NextResponse.json({ comando: "parar", executado });
  }

  if (texto === "/ia") {
    const executado = phone ? await atualizarModoAtendimento(phone, "ia") : false;
    return NextResponse.json({ comando: "ia", executado });
  }

  if (texto.startsWith("@")) {
    const slug = texto.slice(1).split(/\s+/)[0];
    let executado = false;

    if (slug && phone) {
      const supabase = supabaseAdmin();
      const { data: lead } = await supabase
        .from("leads")
        .select("id")
        .eq("numero_whatsapp", phone)
        .maybeSingle();

      if (lead) {
        const { data: acao } = await supabase
          .from("acoes")
          .select("id")
          .eq("slug", slug)
          .eq("ativo", true)
          .maybeSingle();

        if (acao) {
          const resultado = await executarAcao(supabase, acao.id, lead.id);
          executado = resultado.ok;
        }
      }
    }

    return NextResponse.json({ comando: `@${slug}`, executado });
  }

  if (texto && phone) {
    const supabase = supabaseAdmin();
    const { data: lead } = await supabase
      .from("leads")
      .select("id, estagio")
      .eq("numero_whatsapp", phone)
      .maybeSingle();

    if (lead) {
      const acao = await encontrarAcaoPorRegra(supabase, texto, lead.estagio ?? "");
      if (acao) {
        // Dispara a ação da regra condicional em paralelo ao atendimento
        // normal da IA (não bloqueia nem substitui o repasse para o n8n).
        await executarAcao(supabase, acao.id, lead.id).catch(() => null);
      }
    }
  }

  const n8nRes = await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const n8nBody = await n8nRes.text();
  return new NextResponse(n8nBody, {
    status: n8nRes.status,
    headers: { "Content-Type": n8nRes.headers.get("Content-Type") ?? "application/json" },
  });
}
