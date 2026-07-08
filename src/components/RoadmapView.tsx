"use client";

import Link from "next/link";
import type { RoadmapUnit } from "@/lib/roadmap";

const LESSON_ICON: Record<string, string> = {
  READING: "📖",
  QUIZ: "📝",
  FLASHCARD: "🗂️",
  PRACTICE: "💪",
  CHALLENGE: "🏆",
};

export function RoadmapView({ units }: { units: RoadmapUnit[] }) {
  return (
    <div className="flex flex-col gap-12">
      {units.map((unit) => (
        <section key={unit.id}>
          <div
            className="mb-6 flex items-center gap-3 rounded-2xl px-5 py-4 text-white shadow-sm"
            style={{ backgroundColor: unit.color }}
          >
            <span className="text-2xl">{unit.iconEmoji}</span>
            <div>
              <h2 className="text-lg font-extrabold">{unit.title}</h2>
              {unit.description && <p className="text-sm opacity-90">{unit.description}</p>}
            </div>
          </div>

          <div className="flex flex-col items-center gap-6">
            {unit.lessons.map((lesson, idx) => {
              const offset = idx % 2 === 0 ? "-translate-x-10" : "translate-x-10";
              const isDone = lesson.status === "COMPLETED" || lesson.status === "PERFECT";
              return (
                <div key={lesson.id} className={`flex flex-col items-center gap-1 ${offset}`}>
                  <Link
                    href={lesson.isLocked ? "#" : `/lesson/${lesson.id}`}
                    aria-disabled={lesson.isLocked}
                    className={`flex h-16 w-16 items-center justify-center rounded-full border-b-4 text-2xl shadow transition-transform ${
                      lesson.isLocked
                        ? "pointer-events-none border-[var(--border)] bg-[var(--card)] text-[var(--gray)]"
                        : isDone
                        ? "border-[var(--green-dark)] bg-[var(--green)] text-white hover:-translate-y-0.5"
                        : "border-[#1899d6] bg-[var(--blue)] text-white hover:-translate-y-0.5"
                    }`}
                  >
                    {lesson.isLocked ? "🔒" : lesson.status === "PERFECT" ? "💯" : isDone ? "✅" : LESSON_ICON[lesson.type] ?? "📘"}
                  </Link>
                  <span className="max-w-[8rem] text-center text-xs font-semibold text-[var(--gray)]">
                    {lesson.title}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
