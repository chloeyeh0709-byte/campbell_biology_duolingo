import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getRoadmap } from "@/lib/roadmap";
import { getUserWithFreshHearts } from "@/lib/gamification";

export async function GET(_req: Request, { params }: { params: { courseId: string } }) {
  const authedUser = await requireUser().catch(() => null);
  if (!authedUser) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const [roadmap, user] = await Promise.all([
    getRoadmap(params.courseId, authedUser.id),
    getUserWithFreshHearts(authedUser.id),
  ]);

  return NextResponse.json({
    units: roadmap,
    user: {
      xp: user.xp,
      level: user.level,
      streakDays: user.streakDays,
      hearts: user.hearts,
      maxHearts: user.maxHearts,
    },
  });
}
