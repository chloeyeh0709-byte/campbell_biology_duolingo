// Shape of the curriculum JSON files that prisma/seed.ts loads into the database.
// `id` fields on concepts are *local* keys (not DB ids) — they only exist so that
// edges/parentId/lessons can reference concepts within the same JSON file. The
// seed script maps them to real cuids when it inserts rows.

export interface SeedOption {
  id: string;
  text: string;
}

export interface SeedMatchPair {
  left: string;
  right: string;
}

export type SeedQuestionType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "FILL_IN_THE_BLANK"
  | "SHORT_ANSWER"
  | "FLASHCARD"
  | "MATCHING";

export interface SeedQuestion {
  type: SeedQuestionType;
  order: number;
  /** Required for all types except FLASHCARD, which uses `front` as the prompt instead. */
  prompt?: string;
  explanation?: string;
  difficulty?: number;
  sourceInfo?: string;
  options?: SeedOption[];
  correctOptionId?: string;
  blankAnswer?: string;
  blankHint?: string;
  front?: string;
  back?: string;
  matchPairs?: SeedMatchPair[];
}

export interface SeedSlide {
  order: number;
  title?: string;
  content: string;
  imageUrl?: string;
}

export type SeedLessonType = "READING" | "QUIZ" | "FLASHCARD" | "PRACTICE" | "CHALLENGE";

export interface SeedLesson {
  title: string;
  type: SeedLessonType;
  order: number;
  xpReward?: number;
  estimatedMinutes?: number;
  /** Local concept keys this lesson teaches/tests, used to build LessonConcept rows. */
  conceptIds: string[];
  slides: SeedSlide[];
  questions: SeedQuestion[];
}

export interface SeedUnit {
  title: string;
  description?: string;
  order: number;
  color?: string;
  iconEmoji?: string;
  lessons: SeedLesson[];
}

export type SeedEdgeRelationType = "PREREQUISITE" | "RELATED" | "EXTENDS" | "CONTRASTS" | "PART_OF";

export interface SeedEdge {
  sourceId: string; // local concept key
  targetId: string; // local concept key
  relationshipType: SeedEdgeRelationType;
  weight?: number;
}

export interface SeedConcept {
  /** Local key, referenced by edges/lessons/parentId within this file. Not stored in the DB. */
  id: string;
  name: string;
  summary: string;
  importance?: number;
  difficulty?: number;
  tags?: string[];
  posX?: number;
  posY?: number;
  parentId?: string; // local concept key
}

export interface SeedCourse {
  title: string;
  description?: string;
  subject?: string;
  concepts: SeedConcept[];
  edges: SeedEdge[];
  units: SeedUnit[];
}
