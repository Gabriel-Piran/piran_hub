import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    let id = formData.get("id") as string || "";

    if (!file) {
      return NextResponse.json({ error: "Arquivo é obrigatório" }, { status: 400 });
    }

    if (!id) {
      id = crypto.randomUUID();
    }

    const supabase = supabaseAdmin();
    
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const path = `${id}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("mensagens-rapidas")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Erro no upload do Storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const url_publica = supabase.storage
      .from("mensagens-rapidas")
      .getPublicUrl(path).data.publicUrl;

    return NextResponse.json({ url: url_publica });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
