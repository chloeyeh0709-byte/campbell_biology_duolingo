import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const courses = await db.course.findMany({
    select: { id: true, title: true, description: true, subject: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ courses });
}
