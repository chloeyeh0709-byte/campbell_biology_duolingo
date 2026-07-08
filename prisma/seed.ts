import { readFileSync } from "fs";
import path from "path";
import { loadCurriculum } from "./seed/load-curriculum";
import { db } from "../src/lib/db";
import { ensureAchievementsSeeded } from "../src/lib/gamification";
import type { SeedCourse } from "./seed/curriculum-schema";

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--replace");
  const replace = process.argv.includes("--replace");
  const curriculumPath = args[0] ?? path.join(__dirname, "seed", "sample-curriculum.json");
  const seed: SeedCourse = JSON.parse(readFileSync(curriculumPath, "utf-8"));

  const course = await loadCurriculum(db, seed, { replace });
  await ensureAchievementsSeeded();

  console.log(
    `Seeded course "${course.title}" (${course.id}) from ${curriculumPath}${replace ? " (replaced existing course)" : ""}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
