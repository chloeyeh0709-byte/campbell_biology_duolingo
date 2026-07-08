import { PrismaClient } from "@prisma/client";
import type { SeedCourse } from "./curriculum-schema";

/** Inserts a full course (concepts/edges/units/lessons/slides/questions) into the database.
 * If a course with the same title already exists, it is deleted first (cascades to
 * everything under it) so this script is safe to re-run while iterating on content. */
export async function loadCurriculum(db: PrismaClient, seed: SeedCourse) {
  const existing = await db.course.findFirst({ where: { title: seed.title } });
  if (existing) {
    await db.course.delete({ where: { id: existing.id } });
  }

  const course = await db.course.create({
    data: {
      title: seed.title,
      description: seed.description,
      subject: seed.subject ?? "Biology",
    },
  });

  // 1. Concepts (map local JSON key -> real DB id, two passes for parentId self-refs)
  const conceptIdByLocalKey = new Map<string, string>();
  for (const concept of seed.concepts) {
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
    if (!childId || !parentId) continue;
    await db.concept.update({ where: { id: childId }, data: { parentId } });
  }

  // 2. Concept edges
  for (const edge of seed.edges) {
    const sourceId = conceptIdByLocalKey.get(edge.sourceId);
    const targetId = conceptIdByLocalKey.get(edge.targetId);
    if (!sourceId || !targetId) {
      throw new Error(`Edge references unknown concept key: ${edge.sourceId} -> ${edge.targetId}`);
    }
    await db.conceptEdge.create({
      data: {
        courseId: course.id,
        sourceId,
        targetId,
        relationshipType: edge.relationshipType,
        weight: edge.weight ?? 1.0,
      },
    });
  }

  // 3. Units -> lessons -> slides/questions/conceptLinks
  for (const unit of seed.units) {
    const createdUnit = await db.unit.create({
      data: {
        courseId: course.id,
        title: unit.title,
        description: unit.description,
        order: unit.order,
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
