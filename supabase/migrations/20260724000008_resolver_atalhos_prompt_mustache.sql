-- Ajusta resolver_atalhos_prompt pra só substituir o atalho quando ele
-- aparece entre chaves duplas, ex.: "{{/horario}}" — não mais qualquer
-- ocorrência solta de "/horario" no texto do prompt.
--
-- Motivo: a versão anterior trocava QUALQUER menção ao atalho no texto,
-- inclusive dentro de instruções condicionais escritas em linguagem
-- natural (ex.: 'Se o lead disser "bom dia" envie /teste'), destruindo a
-- instrução em vez de deixar a IA decidir. Com {{...}} fica explícito
-- que o admin quer o conteúdo colado ali na hora — instruções
-- condicionais continuam livres pra IA interpretar e disparar
-- [ACAO: ENVIAR_RAPIDA=/atalho] quando fizer sentido (funciona pra
-- texto, áudio, vídeo ou imagem — resolver_atalhos_prompt só cobre
-- texto colado direto no meio da resposta).
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
    resultado := replace(resultado, '{{' || r.atalho || '}}', r.conteudo);
  END LOOP;

  RETURN resultado;
END;
$$;
