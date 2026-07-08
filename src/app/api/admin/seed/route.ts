import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loadCurriculum } from "../../../../../prisma/seed/load-curriculum";
import { ensureAchievementsSeeded } from "@/lib/gamification";
import seedData from "../../../../../prisma/seed/organic-chemistry-ch1-4.json";
import type { SeedCourse } from "../../../../../prisma/seed/curriculum-schema";

// Temporary, one-time-use endpoint for loading course content into a freshly
// deployed production database from environments that can't reach Postgres
// directly (only HTTPS egress). Protected by SEED_SECRET; remove this route
// once the initial content has been imported.
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
