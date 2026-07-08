import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getPlayableLesson } from "@/lib/lesson-view";

export async function GET(_req: Request, { params }: { params: { lessonId: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  try {
    const lesson = await getPlayableLesson(params.lessonId, user.id);
    return NextResponse.json(lesson);
  } catch (err) {
    if (err instanceof Error && err.message === "LESSON_LOCKED") {
      return NextResponse.json({ error: "這堂課還被鎖住，請先完成前一堂課" }, { status: 403 });
    }
    return NextResponse.json({ error: "找不到這堂課" }, { status: 404 });
  }
}
