export function zapiConfig() {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token || !clientToken) return null;

  return {
    baseUrl: `https://api.z-api.io/instances/${instanceId}/token/${token}`,
    headers: {
      "Content-Type": "application/json",
      "Client-Token": clientToken,
    } as Record<string, string>,
  };
}
