import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getRoadmap } from "@/lib/roadmap";
import { getUserWithFreshHearts } from "@/lib/gamification";
import { db } from "@/lib/db";
import { TopBar } from "@/components/TopBar";
import { RoadmapView } from "@/components/RoadmapView";

export default async function CoursePage({ params }: { params: { courseId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const course = await db.course.findUnique({ where: { id: params.courseId } });
  if (!course) redirect("/");

  const [roadmap, freshUser] = await Promise.all([
    getRoadmap(params.courseId, user.id),
    getUserWithFreshHearts(user.id),
  ]);

  return (
    <div className="min-h-screen pb-16">
      <TopBar
        courseId={params.courseId}
        stats={{
          xp: freshUser.xp,
          level: freshUser.level,
          streakDays: freshUser.streakDays,
          hearts: freshUser.hearts,
          maxHearts: freshUser.maxHearts,
        }}
      />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-extrabold">{course.title}</h1>
        <p className="mb-8 text-[var(--gray)]">{course.description}</p>
        <RoadmapView units={roadmap} />
      </main>
    </div>
  );
}
