import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { recordQuestionAttempt, type QuestionAnswer } from "@/lib/questions";
import { getUserWithFreshHearts, spendHeart } from "@/lib/gamification";

const HEART_COST_TYPES = new Set(["MULTIPLE_CHOICE", "TRUE_FALSE", "FILL_IN_THE_BLANK", "MATCHING"]);

export async function POST(req: NextRequest, { params }: { params: { questionId: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const answer = body?.answer as QuestionAnswer | undefined;
  const responseMs = typeof body?.responseMs === "number" ? body.responseMs : 0;
  if (!answer?.type) {
    return NextResponse.json({ error: "缺少作答內容" }, { status: 400 });
  }

  const costsHeart = HEART_COST_TYPES.has(answer.type);
  if (costsHeart) {
    const fresh = await getUserWithFreshHearts(user.id);
    if (fresh.hearts <= 0) {
      return NextResponse.json({ error: "生命值不足，請稍後再試", hearts: fresh.hearts }, { status: 403 });
    }
  }

  const result = await recordQuestionAttempt(user.id, params.questionId, answer, responseMs);

  let heartsRemaining: number | null = null;
  if (costsHeart && !result.isCorrect) {
    const updated = await spendHeart(user.id);
    heartsRemaining = updated.hearts;
  }

  return NextResponse.json({ ...result, heartsRemaining });
}
