import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const url = body?.url;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url é obrigatória" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 });
  }

  const audioRes = await fetch(url);
  if (!audioRes.ok) {
    return NextResponse.json(
      { error: `Não foi possível baixar o áudio (status ${audioRes.status})` },
      { status: 502 }
    );
  }
  const audioBuffer = await audioRes.arrayBuffer();
  const mimeType = audioRes.headers.get("content-type") || "audio/mpeg";

  const formData = new FormData();
  formData.append("file", new Blob([audioBuffer], { type: mimeType }), "audio.mp3");
  formData.append("model", "whisper-1");

  const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!whisperRes.ok) {
    const errText = await whisperRes.text().catch(() => "");
    return NextResponse.json(
      { error: `Falha na transcrição via Whisper: ${errText || whisperRes.status}` },
      { status: 502 }
    );
  }

  const data = await whisperRes.json();
  return NextResponse.json({ transcricao: data.text ?? "" });
}
