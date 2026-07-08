import { db } from "@/lib/db";
import { assertLessonUnlocked } from "@/lib/roadmap";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export interface PlayableQuestion {
  id: string;
  type: string;
  order: number;
  prompt: string;
  difficulty: number;
  sourceInfo: string | null;
  options: { id: string; text: string }[] | null;
  front: string | null;
  blankHint: string | null;
  matchLeft: string[] | null;
  matchRight: string[] | null;
}

export interface PlayableLesson {
  id: string;
  title: string;
  type: string;
  xpReward: number;
  slides: { id: string; order: number; title: string | null; content: string; imageUrl: string | null }[];
  questions: PlayableQuestion[];
}

/** Loads a lesson's slides/questions with answer keys stripped, for client-side play.
 * Throws "LESSON_NOT_FOUND" or "LESSON_LOCKED" if the lesson can't be played right now. */
export async function getPlayableLesson(lessonId: string, userId: string): Promise<PlayableLesson> {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      unit: true,
      slides: { orderBy: { order: "asc" } },
      questions: { orderBy: { order: "asc" } },
    },
  });
  if (!lesson) throw new Error("LESSON_NOT_FOUND");

  await assertLessonUnlocked(lesson.unit.courseId, userId, lesson.id);

  return {
    id: lesson.id,
    title: lesson.title,
    type: lesson.type,
    xpReward: lesson.xpReward,
    slides: lesson.slides,
    questions: lesson.questions.map((q) => ({
      id: q.id,
      type: q.type,
      order: q.order,
      prompt: q.prompt,
      difficulty: q.difficulty,
      sourceInfo: q.sourceInfo,
      options: q.options ? JSON.parse(q.options) : null,
      front: q.front,
      blankHint: q.blankHint,
      matchLeft: q.matchPairs ? (JSON.parse(q.matchPairs) as { left: string; right: string }[]).map((p) => p.left) : null,
      matchRight: q.matchPairs
        ? shuffle((JSON.parse(q.matchPairs) as { left: string; right: string }[]).map((p) => p.right))
        : null,
    })),
  };
}
