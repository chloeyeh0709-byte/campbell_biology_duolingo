import { readFileSync } from "fs";
import path from "path";
import { loadCurriculum } from "./seed/load-curriculum";
import { db } from "../src/lib/db";
import { ensureAchievementsSeeded } from "../src/lib/gamification";
import type { SeedCourse } from "./seed/curriculum-schema";

async function main() {
  const curriculumPath = process.argv[2] ?? path.join(__dirname, "seed", "sample-curriculum.json");
  const seed: SeedCourse = JSON.parse(readFileSync(curriculumPath, "utf-8"));

  const course = await loadCurriculum(db, seed);
  await ensureAchievementsSeeded();

  console.log(`Seeded course "${course.title}" (${course.id}) from ${curriculumPath}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
