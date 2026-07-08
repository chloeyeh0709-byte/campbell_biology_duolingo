"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export interface UserStats {
  xp: number;
  level: number;
  streakDays: number;
  hearts: number;
  maxHearts: number;
}

export function TopBar({ stats, courseId }: { stats: UserStats; courseId?: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-[var(--border)] bg-[var(--bg)] px-4 py-3 sm:px-8">
      <div className="flex items-center gap-4 text-sm font-bold sm:text-base">
        <Link href="/" className="text-lg">
          📚
        </Link>
        <span className="flex items-center gap-1 text-[var(--gold)]">
          ⭐ Lv.{stats.level}
        </span>
        <span className="flex items-center gap-1 text-[var(--gray)]">
          🔶 {stats.xp} XP
        </span>
        <span className="flex items-center gap-1 text-orange-500">
          🔥 {stats.streakDays}
        </span>
        <span className="flex items-center gap-1 text-[var(--red)]">
          ❤️ {stats.hearts}/{stats.maxHearts}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {courseId && (
          <Link href={`/course/${courseId}/graph`} className="text-sm font-bold text-[var(--blue)]">
            知識圖譜
          </Link>
        )}
        <button onClick={handleLogout} className="text-sm font-bold text-[var(--gray)] hover:text-[var(--red)]">
          登出
        </button>
      </div>
    </header>
  );
}
