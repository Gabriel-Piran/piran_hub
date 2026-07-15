export async function transcreverAudio(url: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada");
  }

  const audioRes = await fetch(url);
  if (!audioRes.ok) {
    throw new Error(`Não foi possível baixar o áudio (status ${audioRes.status})`);
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
    throw new Error(`Falha na transcrição via Whisper: ${errText || whisperRes.status}`);
  }

  const data = await whisperRes.json();
  return data.text ?? "";
}
