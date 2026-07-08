import { db } from "@/lib/db";

export interface CatalogCourse {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  totalLessons: number;
  completedLessons: number;
}

/** Courses grouped by subject, each with lesson-completion stats computed fresh
 * from UserLessonProgress rather than relying on a pre-existing enrollment record
 * (course "start" is implicit — there's nothing to enroll in ahead of time). */
export async function getCourseCatalog(userId: string): Promise<Map<string, CatalogCourse[]>> {
  const courses = await db.course.findMany({ orderBy: { createdAt: "asc" } });

  const grouped = new Map<string, CatalogCourse[]>();
  for (const course of courses) {
    const [totalLessons, completedLessons] = await Promise.all([
      db.lesson.count({ where: { unit: { courseId: course.id } } }),
      db.userLessonProgress.count({
        where: { userId, status: { in: ["COMPLETED", "PERFECT"] }, lesson: { unit: { courseId: course.id } } },
      }),
    ]);

    const entry: CatalogCourse = {
      id: course.id,
      title: course.title,
      description: course.description,
      subject: course.subject,
      totalLessons,
      completedLessons,
    };

    const bucket = grouped.get(course.subject) ?? [];
    bucket.push(entry);
    grouped.set(course.subject, bucket);
  }

  return grouped;
}
