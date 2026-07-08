import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getConceptGraph } from "@/lib/graph-view";
import { getUserWithFreshHearts } from "@/lib/gamification";
import { db } from "@/lib/db";
import { TopBar } from "@/components/TopBar";
import { KnowledgeGraph } from "@/components/KnowledgeGraph";

export default async function GraphPage({ params }: { params: { courseId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const course = await db.course.findUnique({ where: { id: params.courseId } });
  if (!course) redirect("/");

  const [graph, freshUser] = await Promise.all([
    getConceptGraph(params.courseId, user.id),
    getUserWithFreshHearts(user.id),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
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
      <main className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-8">
        <h1 className="text-2xl font-extrabold">{course.title} · 知識圖譜</h1>
        <KnowledgeGraph nodes={graph.nodes} edges={graph.edges} />
      </main>
    </div>
  );
}
