import { SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE = "piran_token";
const EIGHT_HOURS_SECONDS = 8 * 60 * 60;
const ONE_HOUR_SECONDS = 60 * 60;

function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET não configurado");
  return new TextEncoder().encode(secret);
}

export type Perfil = "admin" | "advogado" | "secretaria" | "estagio";

export const PERFIS: Perfil[] = ["admin", "advogado", "secretaria", "estagio"];

export interface SessionPayload {
  id: string;
  email: string;
  nome: string;
  perfil: Perfil;
  sessao: string;
}

export interface VerifiedSession extends SessionPayload {
  expiraEm: number;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EIGHT_HOURS_SECONDS}s`)
    .sign(getSecretKey());
}

function isPerfil(value: unknown): value is Perfil {
  return typeof value === "string" && (PERFIS as string[]).includes(value);
}

export async function verifySessionToken(
  token: string
): Promise<VerifiedSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.id !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.nome !== "string" ||
      typeof payload.sessao !== "string" ||
      !isPerfil(payload.perfil) ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    return {
      id: payload.id,
      email: payload.email,
      nome: payload.nome,
      perfil: payload.perfil,
      sessao: payload.sessao,
      expiraEm: payload.exp,
    };
  } catch {
    return null;
  }
}

export function isNearExpiry(expiraEm: number): boolean {
  const secondsLeft = expiraEm - Math.floor(Date.now() / 1000);
  return secondsLeft < ONE_HOUR_SECONDS;
}

export const AUTH_COOKIE_MAX_AGE = EIGHT_HOURS_SECONDS;
