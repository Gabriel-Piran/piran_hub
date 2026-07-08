import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(senha: string): Promise<string> {
  return bcrypt.hash(senha, SALT_ROUNDS);
}

export async function verifyPassword(
  senha: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export function generateResetCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function generateSessionToken(): string {
  return crypto.randomUUID();
}
