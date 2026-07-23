export function autorizadoCron(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  const clientSecret =
    request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret");
  return clientSecret === cronSecret;
}
