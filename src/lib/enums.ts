// SQLite has no native enum type, so the Prisma schema stores these as
// plain strings. These union types + arrays are the source of truth for
// valid values at the application layer.

export const LESSON_TYPES = ["READING", "QUIZ", "FLASHCARD", "PRACTICE", "CHALLENGE"] as const;
export type LessonType = (typeof LESSON_TYPES)[number];

export const MASTERY_STATUSES = ["NOT_STUDIED", "NEEDS_IMPROVEMENT", "STRUGGLING", "MASTERED"] as const;
export type MasteryStatus = (typeof MASTERY_STATUSES)[number];

export const EDGE_RELATION_TYPES = ["PREREQUISITE", "RELATED", "EXTENDS", "CONTRASTS", "PART_OF"] as const;
export type EdgeRelationType = (typeof EDGE_RELATION_TYPES)[number];

export const QUESTION_TYPES = [
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "FILL_IN_THE_BLANK",
  "SHORT_ANSWER",
  "FLASHCARD",
  "MATCHING",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const LESSON_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "PERFECT"] as const;
export type LessonStatus = (typeof LESSON_STATUSES)[number];
