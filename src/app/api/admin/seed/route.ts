import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loadCurriculum } from "../../../../../prisma/seed/load-curriculum";
import { ensureAchievementsSeeded } from "@/lib/gamification";
import seedData from "../../../../../prisma/seed/organic-chemistry-ch15-19.json";
import type { SeedCourse } from "../../../../../prisma/seed/curriculum-schema";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const course = await loadCurriculum(db, seedData as SeedCourse);
  await ensureAchievementsSeeded();
  return NextResponse.json({ ok: true, courseId: course.id, title: course.title });
}
