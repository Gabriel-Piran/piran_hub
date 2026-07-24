-- Função que resolve, dentro de um texto de prompt, qualquer atalho de
-- mensagens_rapidas (ex.: "/horario") para o conteúdo real cadastrado.
-- Permite que quem edita os prompts em /dashboard/aline escreva só o
-- atalho (ex.: "/horario") em vez de colar o link/texto inteiro à mão —
-- se o conteúdo da mensagem rápida mudar depois, o prompt acompanha
-- automaticamente, sem precisar editar o texto do prompt de novo.
-- Só considera mensagens_rapidas do tipo "texto" (áudio/imagem/vídeo não
-- têm um texto substituível). Ordena por tamanho do atalho decrescente
-- pra evitar que um atalho mais curto (ex.: "/t") substitua por engano
-- parte de um atalho mais longo (ex.: "/test").
-- Rode este arquivo no SQL Editor do Supabase do projeto Piran Hub.

CREATE OR REPLACE FUNCTION resolver_atalhos_prompt(texto TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  r RECORD;
  resultado TEXT := texto;
BEGIN
  IF resultado IS NULL THEN
    RETURN NULL;
  END IF;

  FOR r IN
    SELECT atalho, conteudo
    FROM mensagens_rapidas
    WHERE ativo = true
      AND tipo = 'texto'
      AND atalho IS NOT NULL
      AND conteudo IS NOT NULL
    ORDER BY length(atalho) DESC
  LOOP
    resultado := replace(resultado, r.atalho, r.conteudo);
  END LOOP;

  RETURN resultado;
END;
$$;
