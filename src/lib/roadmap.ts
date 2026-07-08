import { db } from "@/lib/db";

export interface RoadmapLesson {
  id: string;
  title: string;
  type: string;
  order: number;
  xpReward: number;
  estimatedMinutes: number;
  status: string;
  isLocked: boolean;
  score: number | null;
}

export interface RoadmapUnit {
  id: string;
  title: string;
  description: string | null;
  order: number;
  color: string;
  iconEmoji: string;
  lessons: RoadmapLesson[];
}

/** A lesson unlocks once the immediately preceding lesson (flattened across units, ordered)
 * has been completed by this user. The very first lesson is always unlocked. */
export async function getRoadmap(courseId: string, userId: string): Promise<RoadmapUnit[]> {
  const units = await db.unit.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    include: { lessons: { orderBy: { order: "asc" } } },
  });

  const flatLessons = units.flatMap((u) => u.lessons);
  const progressRows = await db.userLessonProgress.findMany({
    where: { userId, lessonId: { in: flatLessons.map((l) => l.id) } },
  });
  const progressByLesson = new Map(progressRows.map((p) => [p.lessonId, p]));

  let previousCompleted = true; // first lesson overall is always unlocked
  const lessonState = new Map<string, { status: string; isLocked: boolean; score: number | null }>();

  for (const lesson of flatLessons) {
    const progress = progressByLesson.get(lesson.id);
    const status = progress?.status ?? "NOT_STARTED";
    const isLocked = !previousCompleted;
    lessonState.set(lesson.id, { status, isLocked, score: progress?.score ?? null });
    previousCompleted = status === "COMPLETED" || status === "PERFECT";
  }

  return units.map((unit) => ({
    id: unit.id,
    title: unit.title,
    description: unit.description,
    order: unit.order,
    color: unit.color,
    iconEmoji: unit.iconEmoji,
    lessons: unit.lessons.map((lesson) => {
      const state = lessonState.get(lesson.id)!;
      return {
        id: lesson.id,
        title: lesson.title,
        type: lesson.type,
        order: lesson.order,
        xpReward: lesson.xpReward,
        estimatedMinutes: lesson.estimatedMinutes,
        status: state.status,
        isLocked: state.isLocked,
        score: state.score,
      };
    }),
  }));
}

export async function assertLessonUnlocked(courseId: string, userId: string, lessonId: string) {
  const roadmap = await getRoadmap(courseId, userId);
  const lesson = roadmap.flatMap((u) => u.lessons).find((l) => l.id === lessonId);
  if (!lesson) throw new Error("LESSON_NOT_FOUND");
  if (lesson.isLocked) throw new Error("LESSON_LOCKED");
  return lesson;
}
