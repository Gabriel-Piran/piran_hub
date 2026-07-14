import type { SupabaseClient } from "@supabase/supabase-js";

export const RESTRICTED_PERFIS = ["secretaria", "estagio"];

export function isRestrictedPerfil(perfil: string | null): boolean {
  return !!perfil && RESTRICTED_PERFIS.includes(perfil);
}

/**
 * Para perfis restritos (secretaria/estagio), retorna os IDs de departamento
 * aos quais o usuário tem acesso (tabela usuarios_departamentos). Admin e
 * advogado não são restritos e não devem chamar esta função para filtrar.
 */
export async function getDepartamentoIdsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("usuarios_departamentos")
    .select("departamento_id")
    .eq("usuario_id", userId);

  return (data ?? []).map((v) => v.departamento_id as string);
}

/**
 * Lê os headers injetados pelo middleware (x-user-perfil/x-user-id) e,
 * se o perfil for restrito, retorna a lista de departamento_id permitidos.
 * Retorna `null` quando o usuário não deve ser restrito (vê tudo).
 */
export async function resolveDepartamentoRestricao(
  request: Request,
  supabase: SupabaseClient
): Promise<string[] | null> {
  const perfil = request.headers.get("x-user-perfil");
  const userId = request.headers.get("x-user-id");

  if (!isRestrictedPerfil(perfil) || !userId) return null;

  return getDepartamentoIdsForUser(supabase, userId);
}
