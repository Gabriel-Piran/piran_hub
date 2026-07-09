import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  AUTH_COOKIE,
  AUTH_COOKIE_MAX_AGE,
  isNearExpiry,
  signSessionToken,
  verifySessionToken,
} from "@/lib/auth";
import type { Perfil } from "@/lib/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};

const ALL_PERFIS: Perfil[] = ["admin", "advogado", "secretaria", "estagio"];

interface RouteRule {
  prefix: string;
  roles: Perfil[];
  methods?: string[];
}

// Ordem importa: prefixos mais específicos primeiro.
const PAGE_RULES: RouteRule[] = [
  { prefix: "/dashboard/configuracoes", roles: ["admin"] },
  { prefix: "/dashboard/aline", roles: ["admin", "advogado"] },
  { prefix: "/dashboard/contratos", roles: ["admin", "advogado"] },
  { prefix: "/dashboard/perfil", roles: ALL_PERFIS },
  { prefix: "/dashboard/leads", roles: ALL_PERFIS },
  { prefix: "/dashboard/conversas", roles: ALL_PERFIS },
  { prefix: "/dashboard", roles: ["admin", "advogado"] },
];

const API_RULES: RouteRule[] = [
  { prefix: "/api/usuarios/me", roles: ALL_PERFIS },
  { prefix: "/api/usuarios", roles: ["admin"] },
  { prefix: "/api/configuracoes/whatsapp-status", roles: ["admin"] },
  {
    prefix: "/api/configuracoes/perfil",
    roles: ["admin"],
    methods: ["PATCH", "POST", "DELETE"],
  },
  { prefix: "/api/contratos", roles: ["admin", "advogado"] },
  { prefix: "/api/dashboard", roles: ["admin", "advogado"] },
  {
    prefix: "/api/prompts",
    roles: ["admin"],
    methods: ["PATCH", "POST", "DELETE"],
  },
  { prefix: "/api/prompts", roles: ["admin", "advogado"] },
  {
    prefix: "/api/mensagens/enviar",
    roles: ["admin", "advogado", "secretaria"],
    methods: ["POST"],
  },
  {
    prefix: "/api/leads",
    roles: ["admin", "advogado", "secretaria"],
    methods: ["PATCH", "POST", "DELETE"],
  },
];

function matchRule(rules: RouteRule[], pathname: string, method: string) {
  return rules.find((rule) => {
    const matchesPath =
      pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`);
    if (!matchesPath) return false;
    if (rule.methods && !rule.methods.includes(method)) return false;
    return true;
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth") || pathname === "/api/health") {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/api")) {
    const rule = matchRule(API_RULES, pathname, request.method);
    if (rule && !rule.roles.includes(session.perfil)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
  } else {
    const rule = matchRule(PAGE_RULES, pathname, request.method);
    if (rule && !rule.roles.includes(session.perfil)) {
      return NextResponse.redirect(new URL("/dashboard/leads", request.url));
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", session.id);
  requestHeaders.set("x-user-email", session.email);
  requestHeaders.set("x-user-perfil", session.perfil);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (isNearExpiry(session.expiraEm)) {
    const refreshedToken = await signSessionToken({
      id: session.id,
      email: session.email,
      nome: session.nome,
      perfil: session.perfil,
      sessao: session.sessao,
    });
    response.cookies.set(AUTH_COOKIE, refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: AUTH_COOKIE_MAX_AGE,
      path: "/",
    });
  }

  return response;
}
