import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
  }

  setSessionCookie(user.id);

  return NextResponse.json({ id: user.id, email: user.email, name: user.name });
}
