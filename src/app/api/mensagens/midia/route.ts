import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { zapiConfig } from "@/lib/zapi";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const supabase = supabaseAdmin();
    const zapi = zapiConfig();

    if (!zapi) {
      return NextResponse.json({ error: "Z-API não configurada" }, { status: 500 });
    }

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
      fileBuffer = Buffer.from(cleanBase64, "base64");
      
      const timestamp = Date.now();
      fileName = `${timestamp}.ogg`;
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
        extension: "ogg",
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
