import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getCourseCatalog } from "@/lib/catalog";
import { getUserWithFreshHearts } from "@/lib/gamification";
import { TopBar } from "@/components/TopBar";

const SUBJECT_ICON: Record<string, string> = {
  Chemistry: "⚛️",
  Biology: "🧬",
  Physics: "🌀",
  Math: "📐",
};

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    const [catalog, freshUser] = await Promise.all([getCourseCatalog(user.id), getUserWithFreshHearts(user.id)]);
    return (
      <div className="min-h-screen">
        <TopBar
          stats={{
            xp: freshUser.xp,
            level: freshUser.level,
            streakDays: freshUser.streakDays,
            hearts: freshUser.hearts,
            maxHearts: freshUser.maxHearts,
          }}
        />
        <main className="mx-auto max-w-2xl px-4 py-10">
          <h1 className="mb-8 text-2xl font-extrabold">選一本教材開始學習</h1>
          {catalog.size === 0 && <p className="text-[var(--gray)]">目前還沒有任何課程內容，請稍後再來看看。</p>}
          <div className="flex flex-col gap-10">
            {Array.from(catalog.entries()).map(([subject, courses]) => (
              <section key={subject}>
                <h2 className="mb-4 text-lg font-bold text-[var(--gray)]">
                  {SUBJECT_ICON[subject] ?? "📘"} {subject}
                </h2>
                <div className="flex flex-col gap-3">
                  {courses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/course/${course.id}`}
                      className="card-duo flex items-center justify-between gap-4 p-5 transition-transform hover:-translate-y-0.5"
                    >
                      <div>
                        <h3 className="font-extrabold">{course.title}</h3>
                        {course.description && (
                          <p className="mt-1 text-sm text-[var(--gray)]">{course.description}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-sm font-semibold text-[var(--gray)]">
                        {course.completedLessons > 0
                          ? `${course.completedLessons}/${course.totalLessons} 完成`
                          : `${course.totalLessons} 堂課`}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="text-6xl">📚</div>
      <h1 className="text-3xl font-extrabold sm:text-4xl">多鄰國風格教科書學習系統</h1>
      <p className="max-w-md text-[var(--gray)]">
        把教科書變成一關一關的遊戲化課程：解鎖式路線圖、知識圖譜、XP、連勝、生命值，一步步征服各種科目。
      </p>
      <div className="flex gap-4">
        <Link href="/signup" className="btn-duo-green">
          開始學習
        </Link>
        <Link href="/login" className="btn-duo-blue">
          登入
        </Link>
      </div>
    </main>
  );
}
