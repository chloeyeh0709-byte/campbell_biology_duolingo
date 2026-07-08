import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "請輸入有效的 email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "密碼至少需要 8 個字元" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "這個 email 已經被註冊過了" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { email, name: name || null, passwordHash },
  });

  const courses = await db.course.findMany({ select: { id: true } });
  if (courses.length > 0) {
    await db.userCourseProgress.createMany({
      data: courses.map((c) => ({ userId: user.id, courseId: c.id })),
    });
  }

  setSessionCookie(user.id);

  return NextResponse.json({ id: user.id, email: user.email, name: user.name });
}
