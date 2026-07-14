export type ZapiInstancia = "ads" | "indicacoes";

/**
 * Instâncias específicas por funil (ZAPI_ADS_* / ZAPI_INDICACOES_*) têm
 * prioridade; se não configuradas, cai para as variáveis ZAPI_* legadas
 * (hoje só existe um número de WhatsApp configurado, compartilhado pelos
 * dois funis).
 */
export function zapiConfig(instancia?: ZapiInstancia) {
  const prefix = instancia ? `ZAPI_${instancia.toUpperCase()}_` : "ZAPI_";
  const instanceId = process.env[`${prefix}INSTANCE_ID`] ?? process.env.ZAPI_INSTANCE_ID;
  const token = process.env[`${prefix}TOKEN`] ?? process.env.ZAPI_TOKEN;
  const clientToken = process.env[`${prefix}CLIENT_TOKEN`] ?? process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token || !clientToken) return null;

  return {
    baseUrl: `https://api.z-api.io/instances/${instanceId}/token/${token}`,
    headers: {
      "Content-Type": "application/json",
      "Client-Token": clientToken,
    } as Record<string, string>,
  };
}
