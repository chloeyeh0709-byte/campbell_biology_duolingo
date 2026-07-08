import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    const firstCourse = await db.course.findFirst({ orderBy: { createdAt: "asc" } });
    if (firstCourse) redirect(`/course/${firstCourse.id}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="text-6xl">🧬</div>
      <h1 className="text-3xl font-extrabold sm:text-4xl">Campbell Biology 學習路徑</h1>
      <p className="max-w-md text-[var(--gray)]">
        把教科書變成一關一關的遊戲化課程：解鎖式路線圖、知識圖譜、XP、連勝、生命值，一步步征服生物學。
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
