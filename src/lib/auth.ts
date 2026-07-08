import { SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE = "piran_token";
const EIGHT_HOURS_SECONDS = 8 * 60 * 60;

function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET não configurado");
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  email: string;
  nome: string;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EIGHT_HOURS_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.email !== "string" || typeof payload.nome !== "string") {
      return null;
    }
    return { email: payload.email, nome: payload.nome };
  } catch {
    return null;
  }
}

export const AUTH_COOKIE_MAX_AGE = EIGHT_HOURS_SECONDS;
