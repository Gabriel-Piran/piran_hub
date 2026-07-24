import { supabaseAdmin } from "@/lib/supabase";
import { ensureMidiasBucketPublico } from "@/lib/supabase-storage";
import { zapiConfig, type ZapiInstancia } from "@/lib/zapi";

export interface SincronizarFotoResultado {
  ok: boolean;
  status: number;
  error?: string;
  foto_perfil_url?: string | null;
}

/**
 * Busca a foto de perfil do WhatsApp do lead via Z-API (o link retornado
 * é do CDN do próprio WhatsApp e expira em ~48h) e resube pro nosso
 * Storage, salvando a URL estável em leads.foto_perfil_url. Idempotente:
 * se o lead já tem foto salva, não busca de novo.
 */
export async function sincronizarFotoPerfil(leadId: string): Promise<SincronizarFotoResultado> {
  const supabase = supabaseAdmin();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, numero_whatsapp, instancia, foto_perfil_url")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) {
    return { ok: false, status: 500, error: leadError.message };
  }
  if (!lead) {
    return { ok: false, status: 404, error: "Lead não encontrado" };
  }
  if (lead.foto_perfil_url) {
    return { ok: true, status: 200, foto_perfil_url: lead.foto_perfil_url };
  }

  const zapi = zapiConfig(lead.instancia as ZapiInstancia);
  if (!zapi) {
    return { ok: false, status: 500, error: "Z-API não configurada" };
  }

  const linkRes = await fetch(
    `${zapi.baseUrl}/profile-picture?phone=${encodeURIComponent(lead.numero_whatsapp)}`,
    { headers: zapi.headers }
  );

  if (!linkRes.ok) {
    return { ok: false, status: 502, error: `Falha ao consultar foto na Z-API: ${linkRes.status}` };
  }

  const linkBody = await linkRes.json().catch(() => null);
  const link = linkBody?.link;

  // Nem todo contato tem foto pública — não é erro, só não tem o que salvar.
  if (!link || typeof link !== "string") {
    return { ok: true, status: 200, foto_perfil_url: null };
  }

  const imagemRes = await fetch(link);
  if (!imagemRes.ok) {
    return { ok: false, status: 502, error: `Falha ao baixar a foto: ${imagemRes.status}` };
  }

  const buffer = Buffer.from(await imagemRes.arrayBuffer());
  const contentType = imagemRes.headers.get("content-type") || "image/jpeg";
  const ext = contentType.split("/")[1]?.split(";")[0]?.trim() || "jpg";
  const path = `perfis/${leadId}.${ext}`;

  await ensureMidiasBucketPublico(supabase);

  const { error: uploadError } = await supabase.storage
    .from("midias")
    .upload(path, buffer, { contentType, upsert: true });

  if (uploadError) {
    return { ok: false, status: 500, error: `Erro no upload do Storage: ${uploadError.message}` };
  }

  const url_publica = supabase.storage.from("midias").getPublicUrl(path).data.publicUrl;

  const { error: updateError } = await supabase
    .from("leads")
    .update({ foto_perfil_url: url_publica })
    .eq("id", leadId);

  if (updateError) {
    return { ok: false, status: 500, error: updateError.message };
  }

  return { ok: true, status: 200, foto_perfil_url: url_publica };
}
