import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { zapiConfig } from "@/lib/zapi";

/**
 * O navegador grava em WebM/Opus, MP4/AAC (Safari) ou, raramente, Ogg,
 * dependendo do que o MediaRecorder suporta — nunca MP3. A Z-API só tem
 * suporte documentado e confirmado para MP3 (o único exemplo funcional na
 * doc oficial usa "data:audio/mpeg;base64,..."); enviar outros containers
 * crus faz a conversão deles falhar (ConvertMediaException). Por isso o
 * áudio é sempre transcodificado para MP3 aqui, independente do formato
 * gravado no browser. Requer o binário `ffmpeg` instalado na imagem (ver
 * Dockerfile).
 */
async function transcodeToMp3(input: Buffer): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "audio-"));
  const inputPath = join(dir, "input");
  const outputPath = join(dir, "output.mp3");

  try {
    await writeFile(inputPath, input);

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-y",
        "-i", inputPath,
        "-c:a", "libmp3lame",
        "-b:a", "32k",
        "-ac", "1",
        "-ar", "16000",
        outputPath,
      ]);

      let stderr = "";
      ffmpeg.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      ffmpeg.on("error", reject);
      ffmpeg.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg falhou (código ${code}): ${stderr.slice(-500)}`));
      });
    });

    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Garante que o bucket 'midias' existe e é público. Sem isso, a URL gerada
 * por getPublicUrl() aponta para um arquivo inacessível (404/403), e a
 * Z-API recebe uma página de erro em vez de áudio ao tentar buscá-la —
 * o que aparece como "Fail to convert audio" sem indicar a causa real.
 */
async function ensureMidiasBucketPublico(supabase: ReturnType<typeof supabaseAdmin>) {
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucket = buckets?.find((b) => b.name === "midias");

  if (!bucket) {
    await supabase.storage.createBucket("midias", { public: true });
  } else if (!bucket.public) {
    await supabase.storage.updateBucket("midias", { public: true });
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const supabase = supabaseAdmin();
    const zapi = zapiConfig();

    if (!zapi) {
      return NextResponse.json({ error: "Z-API não configurada" }, { status: 500 });
    }

    await ensureMidiasBucketPublico(supabase);

    let leadId = "";
    let tipo = "";
    let fileBuffer: Buffer;
    let fileName = "";
    let fileMimeType = "";
    let path = "";

    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => null);
      if (!body) {
        return NextResponse.json({ error: "Corpo JSON inválido" }, { status: 400 });
      }

      leadId = body.lead_id;
      tipo = body.tipo;
      const base64Data = body.dados;
      fileMimeType = body.mime_type || "audio/ogg";

      if (!leadId || tipo !== "audio" || !base64Data) {
        return NextResponse.json(
          { error: "lead_id, tipo='audio' e dados (base64) são obrigatórios" },
          { status: 400 }
        );
      }

      // Decodifica base64
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
      const rawBuffer = Buffer.from(cleanBase64, "base64");

      try {
        fileBuffer = await transcodeToMp3(rawBuffer);
      } catch (err) {
        return NextResponse.json(
          { error: `Falha ao converter o áudio gravado: ${(err as Error).message}` },
          { status: 500 }
        );
      }
      fileMimeType = "audio/mpeg";

      const timestamp = Date.now();
      fileName = `${timestamp}.mp3`;
      path = `audios/${leadId}/${fileName}`;

    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      leadId = formData.get("lead_id") as string || "";

      if (!file || !leadId) {
        return NextResponse.json({ error: "file e lead_id são obrigatórios" }, { status: 400 });
      }

      const isImage = file.type.startsWith("image/");
      tipo = isImage ? "imagem" : "documento";
      fileMimeType = file.type;
      
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      
      const timestamp = Date.now();
      fileName = file.name;
      const folder = isImage ? "imagens" : "documentos";
      path = `${folder}/${leadId}/${timestamp}_${fileName}`;
    } else {
      return NextResponse.json({ error: "Content-Type não suportado" }, { status: 400 });
    }

    // 1) Upload para o Supabase Storage no bucket 'midias'
    const { error: uploadError } = await supabase.storage
      .from("midias")
      .upload(path, fileBuffer, {
        contentType: fileMimeType,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Erro no upload do Storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Obter URL pública
    const url_publica = supabase.storage.from("midias").getPublicUrl(path).data.publicUrl;

    // Confirma que a URL pública é de fato acessível antes de repassar à
    // Z-API — se o bucket estiver privado ou a política de acesso bloquear,
    // é melhor falhar aqui com um erro claro do que deixar a Z-API tentar
    // "converter" uma página de erro.
    try {
      const urlCheck = await fetch(url_publica, { method: "GET", cache: "no-store" });
      if (!urlCheck.ok) {
        return NextResponse.json(
          {
            error: `Arquivo enviado ao Storage não está acessível publicamente (status ${urlCheck.status}). Verifique se o bucket 'midias' está marcado como público.`,
          },
          { status: 502 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Não foi possível acessar a URL pública do arquivo enviado ao Storage." },
        { status: 502 }
      );
    }

    // 2) Buscar telefone do lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, numero_whatsapp")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    // 3) Enviar para o WhatsApp via Z-API
    let zapiPath = "";
    let zapiBody: any = {};

    if (tipo === "audio") {
      zapiPath = "send-audio";
      zapiBody = {
        phone: lead.numero_whatsapp,
        audio: url_publica,
        extension: "mp3",
      };
    } else if (tipo === "imagem") {
      zapiPath = "send-image";
      zapiBody = {
        phone: lead.numero_whatsapp,
        image: url_publica,
        caption: "",
      };
    } else {
      zapiPath = "send-document";
      zapiBody = {
        phone: lead.numero_whatsapp,
        document: url_publica,
        fileName: fileName,
      };
    }

    const zapiRes = await fetch(`${zapi.baseUrl}/${zapiPath}`, {
      method: "POST",
      headers: zapi.headers,
      body: JSON.stringify(zapiBody),
    });

    if (!zapiRes.ok) {
      const errText = await zapiRes.text().catch(() => "");
      return NextResponse.json(
        { error: `Falha ao enviar via Z-API: ${errText || zapiRes.status}` },
        { status: 502 }
      );
    }

    // 4) Salvar na tabela mensagens
    const { data: savedMsg, error: saveError } = await supabase
      .from("mensagens")
      .insert({
        lead_id: leadId,
        conteudo: tipo === "audio" ? "[Áudio]" : fileName,
        role: "sistema",
        tipo: tipo,
        midia_url: url_publica,
        enviado_em: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (saveError) {
      return NextResponse.json(
        { error: `Erro ao salvar mensagem: ${saveError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, mensagem: savedMsg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
