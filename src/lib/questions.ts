import { db } from "@/lib/db";
import type { Question } from "@prisma/client";

export type QuestionAnswer =
  | { type: "MULTIPLE_CHOICE" | "TRUE_FALSE"; optionId: string }
  | { type: "FILL_IN_THE_BLANK"; text: string }
  | { type: "SHORT_ANSWER" | "FLASHCARD"; selfRating: "correct" | "incorrect" }
  | { type: "MATCHING"; pairs: { left: string; right: string }[] };

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function gradeAnswer(question: Question, answer: QuestionAnswer): boolean {
  switch (answer.type) {
    case "MULTIPLE_CHOICE":
    case "TRUE_FALSE":
      return answer.optionId === question.correctOptionId;

    case "FILL_IN_THE_BLANK":
      return normalize(answer.text) === normalize(question.blankAnswer ?? "");

    case "SHORT_ANSWER":
    case "FLASHCARD":
      return answer.selfRating === "correct";

    case "MATCHING": {
      const correctPairs: { left: string; right: string }[] = question.matchPairs
        ? JSON.parse(question.matchPairs)
        : [];
      if (correctPairs.length === 0 || answer.pairs.length !== correctPairs.length) return false;
      return correctPairs.every((cp) =>
        answer.pairs.some((ap) => normalize(ap.left) === normalize(cp.left) && normalize(ap.right) === normalize(cp.right))
      );
    }

    default:
      return false;
  }
}

function nextMasteryStatus(score: number, everStudied: boolean): string {
  if (!everStudied) return "NOT_STUDIED";
  if (score >= 0.8) return "MASTERED";
  if (score >= 0.5) return "NEEDS_IMPROVEMENT";
  return "STRUGGLING";
}

/** Exponential moving average update of a user's mastery for every concept tied to this question's lesson. */
export async function updateConceptMasteryForLesson(userId: string, lessonId: string, isCorrect: boolean) {
  const links = await db.lessonConcept.findMany({ where: { lessonId }, select: { conceptId: true } });
  const now = new Date();

  for (const { conceptId } of links) {
    const existing = await db.userConceptMastery.findUnique({
      where: { userId_conceptId: { userId, conceptId } },
    });
    const prevScore = existing?.masteryScore ?? 0;
    const nextScore = prevScore * 0.7 + (isCorrect ? 1 : 0) * 0.3;
    const status = nextMasteryStatus(nextScore, true);

    await db.userConceptMastery.upsert({
      where: { userId_conceptId: { userId, conceptId } },
      update: { masteryScore: nextScore, masteryStatus: status, lastStudiedAt: now },
      create: { userId, conceptId, masteryScore: nextScore, masteryStatus: status, lastStudiedAt: now },
    });
  }
}

export async function recordQuestionAttempt(
  userId: string,
  questionId: string,
  answer: QuestionAnswer,
  responseMs: number
) {
  const question = await db.question.findUniqueOrThrow({ where: { id: questionId } });
  const isCorrect = gradeAnswer(question, answer);

  await db.questionAttempt.create({
    data: { userId, questionId, isCorrect, responseMs },
  });
  await updateConceptMasteryForLesson(userId, question.lessonId, isCorrect);

  return {
    isCorrect,
    explanation: question.explanation,
    correctOptionId: question.correctOptionId,
    blankAnswer: question.blankAnswer,
  };
}
