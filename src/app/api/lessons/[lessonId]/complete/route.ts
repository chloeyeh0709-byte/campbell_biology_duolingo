import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { completeLesson } from "@/lib/lessons";
import { db } from "@/lib/db";
import { assertLessonUnlocked } from "@/lib/roadmap";

export async function POST(req: NextRequest, { params }: { params: { lessonId: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const correctCount = typeof body?.correctCount === "number" ? body.correctCount : 0;
  const totalCount = typeof body?.totalCount === "number" ? body.totalCount : 0;
  const timeSpentMs = typeof body?.timeSpentMs === "number" ? body.timeSpentMs : 0;

  const lesson = await db.lesson.findUnique({ where: { id: params.lessonId }, include: { unit: true } });
  if (!lesson) return NextResponse.json({ error: "找不到這堂課" }, { status: 404 });

  try {
    await assertLessonUnlocked(lesson.unit.courseId, user.id, lesson.id);
  } catch {
    return NextResponse.json({ error: "這堂課還被鎖住" }, { status: 403 });
  }

  const result = await completeLesson(user.id, params.lessonId, { correctCount, totalCount, timeSpentMs });

  return NextResponse.json({
    passed: result.passed,
    perfect: result.perfect,
    xpEarned: result.progress.xpEarned,
    unlockedAchievements: result.unlockedAchievements,
    user: {
      xp: result.user.xp,
      level: result.user.level,
      streakDays: result.user.streakDays,
      hearts: result.user.hearts,
      maxHearts: result.user.maxHearts,
    },
  });
}
