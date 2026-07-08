import { PrismaClient } from "@prisma/client";
import type { SeedCourse } from "./curriculum-schema";

export interface LoadCurriculumOptions {
  /** If true, an existing course with the same title is deleted and rebuilt from
   * scratch — this destroys any progress students have made in it. Defaults to
   * false: re-running the seed for an existing course merges in new content
   * instead (reuses concepts that already exist by name, skips units whose
   * title already exists, and appends genuinely new units at the end). */
  replace?: boolean;
}

/** Loads a course's concepts/edges/units/lessons/slides/questions into the database.
 * Safe to re-run: by default it merges into an existing course of the same title
 * rather than wiping it, so adding new chapters later won't destroy user progress
 * tied to units/lessons/concepts that were already imported. */
export async function loadCurriculum(db: PrismaClient, seed: SeedCourse, options: LoadCurriculumOptions = {}) {
  const existing = await db.course.findFirst({ where: { title: seed.title } });

  if (existing && options.replace) {
    await db.course.delete({ where: { id: existing.id } });
  }

  const isFreshCourse = !existing || options.replace;

  const course = isFreshCourse
    ? await db.course.create({
        data: {
          title: seed.title,
          description: seed.description,
          subject: seed.subject ?? "Biology",
        },
      })
    : await db.course.update({
        where: { id: existing!.id },
        data: {
          description: seed.description ?? existing!.description,
          subject: seed.subject ?? existing!.subject,
        },
      });

  // 1. Concepts: reuse an existing concept in this course if its name already matches,
  // instead of creating a duplicate (map local JSON key -> real DB id either way).
  const conceptIdByLocalKey = new Map<string, string>();
  const existingConceptsByName = isFreshCourse
    ? new Map<string, string>()
    : new Map((await db.concept.findMany({ where: { courseId: course.id } })).map((c) => [c.name, c.id]));

  for (const concept of seed.concepts) {
    const reuseId = existingConceptsByName.get(concept.name);
    if (reuseId) {
      conceptIdByLocalKey.set(concept.id, reuseId);
      continue;
    }
    const created = await db.concept.create({
      data: {
        courseId: course.id,
        name: concept.name,
        summary: concept.summary,
        importance: concept.importance ?? 0.5,
        difficulty: concept.difficulty ?? 2,
        tags: (concept.tags ?? []).join(","),
        posX: concept.posX ?? 0,
        posY: concept.posY ?? 0,
      },
    });
    conceptIdByLocalKey.set(concept.id, created.id);
  }
  for (const concept of seed.concepts) {
    if (!concept.parentId) continue;
    const childId = conceptIdByLocalKey.get(concept.id);
    const parentId = conceptIdByLocalKey.get(concept.parentId);
    if (!childId || !parentId || childId === parentId) continue;
    await db.concept.update({ where: { id: childId }, data: { parentId } });
  }

  // 2. Concept edges: skip ones that already exist (unique on source/target/type).
  for (const edge of seed.edges) {
    const sourceId = conceptIdByLocalKey.get(edge.sourceId);
    const targetId = conceptIdByLocalKey.get(edge.targetId);
    if (!sourceId || !targetId) {
      throw new Error(`Edge references unknown concept key: ${edge.sourceId} -> ${edge.targetId}`);
    }
    const relationshipType = edge.relationshipType;
    const alreadyExists = await db.conceptEdge.findUnique({
      where: { sourceId_targetId_relationshipType: { sourceId, targetId, relationshipType } },
    });
    if (alreadyExists) continue;
    await db.conceptEdge.create({
      data: { courseId: course.id, sourceId, targetId, relationshipType, weight: edge.weight ?? 1.0 },
    });
  }

  // 3. Units: skip ones whose title already exists in this course (assume already
  // imported — leave their lessons/progress untouched); append genuinely new units
  // after the current highest order, in the order they appear in this file.
  const existingUnits = isFreshCourse ? [] : await db.unit.findMany({ where: { courseId: course.id } });
  const existingUnitTitles = new Set(existingUnits.map((u) => u.title));
  let nextOrder = existingUnits.length > 0 ? Math.max(...existingUnits.map((u) => u.order)) + 1 : 1;

  for (const unit of seed.units) {
    if (existingUnitTitles.has(unit.title)) continue;

    const createdUnit = await db.unit.create({
      data: {
        courseId: course.id,
        title: unit.title,
        description: unit.description,
        order: nextOrder++,
        color: unit.color ?? "#5E6AD2",
        iconEmoji: unit.iconEmoji ?? "🧬",
      },
    });

    for (const lesson of unit.lessons) {
      const createdLesson = await db.lesson.create({
        data: {
          unitId: createdUnit.id,
          title: lesson.title,
          type: lesson.type,
          order: lesson.order,
          xpReward: lesson.xpReward ?? 10,
          estimatedMinutes: lesson.estimatedMinutes ?? 5,
        },
      });

      for (const slide of lesson.slides) {
        await db.lessonSlide.create({
          data: {
            lessonId: createdLesson.id,
            order: slide.order,
            title: slide.title,
            content: slide.content,
            imageUrl: slide.imageUrl,
          },
        });
      }

      for (const question of lesson.questions) {
        await db.question.create({
          data: {
            lessonId: createdLesson.id,
            type: question.type,
            order: question.order,
            prompt: question.prompt ?? question.front ?? "",
            explanation: question.explanation,
            difficulty: question.difficulty ?? 2,
            sourceInfo: question.sourceInfo,
            options: question.options ? JSON.stringify(question.options) : undefined,
            correctOptionId: question.correctOptionId,
            blankAnswer: question.blankAnswer,
            blankHint: question.blankHint,
            front: question.front,
            back: question.back,
            matchPairs: question.matchPairs ? JSON.stringify(question.matchPairs) : undefined,
          },
        });
      }

      for (const localConceptKey of lesson.conceptIds) {
        const conceptId = conceptIdByLocalKey.get(localConceptKey);
        if (!conceptId) continue;
        await db.lessonConcept.create({
          data: { lessonId: createdLesson.id, conceptId },
        });
      }
    }
  }

  return course;
}
