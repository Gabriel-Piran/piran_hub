import { NextResponse } from "next/server";

import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${AUTH_COOKIE}=`));

  const token = match?.slice(AUTH_COOKIE.length + 1);
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  return NextResponse.json(session);
}
