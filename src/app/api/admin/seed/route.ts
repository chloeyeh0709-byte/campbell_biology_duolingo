import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loadCurriculum } from "../../../../../prisma/seed/load-curriculum";
import { ensureAchievementsSeeded } from "@/lib/gamification";
import seedData from "../../../../../prisma/seed/organic-chemistry-ch5-9.json";
import type { SeedCourse } from "../../../../../prisma/seed/curriculum-schema";

// Temporary, one-time-use endpoint for loading course content into production
// from environments that only have HTTPS egress (no direct Postgres access), by
// having Vercel's own server run the seed. Protected by SEED_SECRET; remove this
// route once the content has been imported.
//
// GET so it can be triggered by just visiting a URL in a browser:
// https://<your-app>/api/admin/seed?secret=<SEED_SECRET>
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const course = await loadCurriculum(db, seedData as SeedCourse);
  await ensureAchievementsSeeded();

  return NextResponse.json({ ok: true, courseId: course.id, title: course.title });
}
