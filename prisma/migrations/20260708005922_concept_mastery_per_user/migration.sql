/*
  Warnings:

  - You are about to drop the column `lastStudiedAt` on the `Concept` table. All the data in the column will be lost.
  - You are about to drop the column `masteryScore` on the `Concept` table. All the data in the column will be lost.
  - You are about to drop the column `masteryStatus` on the `Concept` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "UserConceptMastery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "masteryScore" REAL NOT NULL DEFAULT 0.0,
    "masteryStatus" TEXT NOT NULL DEFAULT 'NOT_STUDIED',
    "lastStudiedAt" DATETIME,
    CONSTRAINT "UserConceptMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserConceptMastery_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Concept" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "importance" REAL NOT NULL DEFAULT 0.5,
    "difficulty" INTEGER NOT NULL DEFAULT 2,
    "tags" TEXT NOT NULL DEFAULT '',
    "posX" REAL NOT NULL DEFAULT 0,
    "posY" REAL NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Concept_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Concept_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Concept" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
INSERT INTO "new_Concept" ("courseId", "createdAt", "difficulty", "id", "importance", "name", "parentId", "posX", "posY", "summary", "tags") SELECT "courseId", "createdAt", "difficulty", "id", "importance", "name", "parentId", "posX", "posY", "summary", "tags" FROM "Concept";
DROP TABLE "Concept";
ALTER TABLE "new_Concept" RENAME TO "Concept";
CREATE INDEX "Concept_courseId_idx" ON "Concept"("courseId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "UserConceptMastery_userId_idx" ON "UserConceptMastery"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserConceptMastery_userId_conceptId_key" ON "UserConceptMastery"("userId", "conceptId");
