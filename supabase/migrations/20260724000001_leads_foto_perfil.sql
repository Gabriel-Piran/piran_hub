-- Guarda a foto de perfil do WhatsApp do lead. A URL da Z-API expira em
-- ~48h (é o CDN do próprio WhatsApp), então o link salvo aqui aponta
-- pra uma cópia no nosso Storage (bucket midias/perfis/{lead_id}.ext),
-- não pro link cru da Z-API.
-- Rode este arquivo no SQL Editor do Supabase do projeto Piran Hub.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT;
