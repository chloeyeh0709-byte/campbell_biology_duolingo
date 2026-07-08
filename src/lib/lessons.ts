import { db } from "@/lib/db";
import { awardXpAndTouchStreak, evaluateAchievements, getUserWithFreshHearts } from "@/lib/gamification";

const PASS_THRESHOLD = 0.6;

export interface CompleteLessonInput {
  correctCount: number;
  totalCount: number;
  timeSpentMs: number;
}

export async function completeLesson(userId: string, lessonId: string, input: CompleteLessonInput) {
  const lesson = await db.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: { unit: true },
  });
  const courseId = lesson.unit.courseId;

  const score = input.totalCount > 0 ? input.correctCount / input.totalCount : 0;
  const passed = score >= PASS_THRESHOLD;
  const perfect = input.totalCount > 0 && input.correctCount === input.totalCount;

  const existing = await db.userLessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });
  const wasAlreadyPassed = existing?.status === "COMPLETED" || existing?.status === "PERFECT";

  const newStatus = passed ? (perfect ? "PERFECT" : "COMPLETED") : "IN_PROGRESS";
  const xpForThisCompletion = passed && !wasAlreadyPassed ? lesson.xpReward : 0;

  const progress = await db.userLessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: {
      userId,
      lessonId,
      status: newStatus,
      score,
      xpEarned: xpForThisCompletion,
      attempts: 1,
      timeSpentMs: input.timeSpentMs,
      completedAt: passed ? new Date() : null,
    },
    update: {
      status: wasAlreadyPassed ? existing!.status : newStatus,
      score: Math.max(existing?.score ?? 0, score),
      xpEarned: { increment: xpForThisCompletion },
      attempts: { increment: 1 },
      timeSpentMs: { increment: input.timeSpentMs },
      completedAt: passed && !wasAlreadyPassed ? new Date() : existing?.completedAt,
    },
  });

  await syncCourseProgress(userId, courseId);

  let user = xpForThisCompletion > 0 ? await awardXpAndTouchStreak(userId, xpForThisCompletion) : await getUserWithFreshHearts(userId);

  const unlockedAchievements = await evaluateAchievements(userId, {
    justCompletedLesson: passed && !wasAlreadyPassed,
    perfectScore: perfect,
  });

  if (unlockedAchievements.length > 0) {
    user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  }

  return { progress, passed, perfect, user, unlockedAchievements };
}

async function syncCourseProgress(userId: string, courseId: string) {
  const totalLessons = await db.lesson.count({ where: { unit: { courseId } } });
  const completedLessons = await db.userLessonProgress.count({
    where: { userId, status: { in: ["COMPLETED", "PERFECT"] }, lesson: { unit: { courseId } } },
  });
  const attempts = await db.questionAttempt.count({
    where: { userId, question: { lesson: { unit: { courseId } } } },
  });
  const correct = await db.questionAttempt.count({
    where: { userId, isCorrect: true, question: { lesson: { unit: { courseId } } } },
  });
  const xpAgg = await db.userLessonProgress.aggregate({
    where: { userId, lesson: { unit: { courseId } } },
    _sum: { xpEarned: true },
  });

  await db.userCourseProgress.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: {
      userId,
      courseId,
      completedLessons,
      totalLessons,
      xpEarned: xpAgg._sum.xpEarned ?? 0,
      accuracyRate: attempts > 0 ? correct / attempts : 0,
      lastStudiedAt: new Date(),
    },
    update: {
      completedLessons,
      totalLessons,
      xpEarned: xpAgg._sum.xpEarned ?? 0,
      accuracyRate: attempts > 0 ? correct / attempts : 0,
      lastStudiedAt: new Date(),
    },
  });
}
