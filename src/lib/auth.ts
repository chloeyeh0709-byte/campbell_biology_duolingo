import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE = "athena_session";
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-insecure-secret-change-me";
const SESSION_DAYS = 30;

interface SessionPayload {
  userId: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createSessionToken(userId: string): string {
  return jwt.sign({ userId } satisfies SessionPayload, JWT_SECRET, {
    expiresIn: `${SESSION_DAYS}d`,
  });
}

export function setSessionCookie(userId: string) {
  cookies().set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}

function readSessionUserId(): string | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as SessionPayload;
    return payload.userId;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const userId = readSessionUserId();
  if (!userId) return null;
  return db.user.findUnique({ where: { id: userId } });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
