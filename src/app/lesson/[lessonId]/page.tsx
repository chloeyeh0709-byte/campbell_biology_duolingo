import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPlayableLesson } from "@/lib/lesson-view";
import { db } from "@/lib/db";
import { LessonPlayer } from "@/components/LessonPlayer";

export default async function LessonPage({ params }: { params: { lessonId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const lessonRow = await db.lesson.findUnique({
    where: { id: params.lessonId },
    include: { unit: true },
  });
  if (!lessonRow) redirect("/");

  let lesson;
  try {
    lesson = await getPlayableLesson(params.lessonId, user.id);
  } catch {
    redirect(`/course/${lessonRow.unit.courseId}`);
  }

  return <LessonPlayer lesson={lesson} courseId={lessonRow.unit.courseId} />;
}
