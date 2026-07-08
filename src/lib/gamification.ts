import { db } from "@/lib/db";

export const MAX_LEVEL = 20;
const HEART_REFILL_MINUTES = 4 * 60; // one heart every 4 hours

/** Cumulative XP required to *reach* a given level (level 1 = 0 XP). */
function cumulativeXpForLevel(level: number): number {
  // Each level requires 100 more XP than the previous one (triangular curve).
  const n = level - 1;
  return 100 * (n * (n + 1)) / 2;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= cumulativeXpForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

export function xpProgressWithinLevel(xp: number, level: number) {
  const floor = cumulativeXpForLevel(level);
  const ceil = level >= MAX_LEVEL ? floor : cumulativeXpForLevel(level + 1);
  const span = Math.max(1, ceil - floor);
  return { current: xp - floor, needed: span, isMaxLevel: level >= MAX_LEVEL };
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function isYesterday(earlier: Date, later: Date): boolean {
  const oneDayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round(
    (new Date(later.toDateString()).getTime() - new Date(earlier.toDateString()).getTime()) / oneDayMs
  );
  return diffDays === 1;
}

/** Recomputes streak + lastActiveAt for "the user did something today". Returns the new streak. */
export function computeStreakUpdate(lastActiveAt: Date, streakDays: number, now: Date) {
  if (isSameCalendarDay(lastActiveAt, now)) {
    return { streakDays, streakExtended: false };
  }
  if (isYesterday(lastActiveAt, now)) {
    return { streakDays: streakDays + 1, streakExtended: true };
  }
  return { streakDays: 1, streakExtended: true };
}

/** Lazily refills hearts based on elapsed time since heartRefillAt. */
export function computeHeartRefill(hearts: number, maxHearts: number, heartRefillAt: Date | null, now: Date) {
  if (hearts >= maxHearts || !heartRefillAt) {
    return { hearts: Math.min(hearts, maxHearts), heartRefillAt: null as Date | null };
  }
  const minutesElapsed = (now.getTime() - heartRefillAt.getTime()) / 60000;
  const heartsGained = Math.floor(minutesElapsed / HEART_REFILL_MINUTES);
  if (heartsGained <= 0) {
    return { hearts, heartRefillAt };
  }
  const newHearts = Math.min(maxHearts, hearts + heartsGained);
  const remainderMinutes = minutesElapsed - heartsGained * HEART_REFILL_MINUTES;
  const newRefillAt = newHearts >= maxHearts ? null : new Date(now.getTime() - remainderMinutes * 60000);
  return { hearts: newHearts, heartRefillAt: newRefillAt };
}

export async function getUserWithFreshHearts(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const { hearts, heartRefillAt } = computeHeartRefill(user.hearts, user.maxHearts, user.heartRefillAt, new Date());
  if (hearts !== user.hearts) {
    return db.user.update({ where: { id: userId }, data: { hearts, heartRefillAt } });
  }
  return user;
}

export async function spendHeart(userId: string) {
  const user = await getUserWithFreshHearts(userId);
  if (user.hearts <= 0) return user;
  const nextHearts = user.hearts - 1;
  return db.user.update({
    where: { id: userId },
    data: {
      hearts: nextHearts,
      heartRefillAt: user.heartRefillAt ?? new Date(),
    },
  });
}

export async function awardXpAndTouchStreak(userId: string, xpGained: number) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const now = new Date();
  const { streakDays } = computeStreakUpdate(user.lastActiveAt, user.streakDays, now);
  const newXp = user.xp + xpGained;
  const newLevel = levelFromXp(newXp);

  return db.user.update({
    where: { id: userId },
    data: {
      xp: newXp,
      level: newLevel,
      streakDays,
      longestStreak: Math.max(user.longestStreak, streakDays),
      lastActiveAt: now,
    },
  });
}

const ACHIEVEMENT_DEFS = [
  { key: "first_lesson", title: "First Steps", description: "Complete your first lesson", iconEmoji: "🌱", xpReward: 25, category: "milestone" },
  { key: "streak_3", title: "On a Roll", description: "Reach a 3-day streak", iconEmoji: "🔥", xpReward: 30, category: "streak" },
  { key: "streak_7", title: "Week Warrior", description: "Reach a 7-day streak", iconEmoji: "🔥", xpReward: 75, category: "streak" },
  { key: "perfect_lesson", title: "Perfectionist", description: "Complete a lesson with a perfect score", iconEmoji: "💯", xpReward: 40, category: "mastery" },
  { key: "level_5", title: "Rising Scholar", description: "Reach level 5", iconEmoji: "⭐", xpReward: 50, category: "milestone" },
  { key: "level_10", title: "Biology Adept", description: "Reach level 10", iconEmoji: "🏆", xpReward: 100, category: "milestone" },
] as const;

export async function ensureAchievementsSeeded() {
  for (const def of ACHIEVEMENT_DEFS) {
    await db.achievement.upsert({
      where: { key: def.key },
      update: {},
      create: def,
    });
  }
}

export async function unlockAchievement(userId: string, key: string) {
  const achievement = await db.achievement.findUnique({ where: { key } });
  if (!achievement) return null;

  const already = await db.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId: achievement.id } },
  });
  if (already) return null;

  await db.userAchievement.create({ data: { userId, achievementId: achievement.id } });
  await awardXpAndTouchStreak(userId, achievement.xpReward);
  return achievement;
}

export async function evaluateAchievements(userId: string, context: { justCompletedLesson: boolean; perfectScore: boolean }) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const unlocked = [];

  if (context.justCompletedLesson) {
    const lessonCount = await db.userLessonProgress.count({
      where: { userId, status: { in: ["COMPLETED", "PERFECT"] } },
    });
    if (lessonCount === 1) {
      const a = await unlockAchievement(userId, "first_lesson");
      if (a) unlocked.push(a);
    }
  }
  if (context.perfectScore) {
    const a = await unlockAchievement(userId, "perfect_lesson");
    if (a) unlocked.push(a);
  }
  if (user.streakDays >= 3) {
    const a = await unlockAchievement(userId, "streak_3");
    if (a) unlocked.push(a);
  }
  if (user.streakDays >= 7) {
    const a = await unlockAchievement(userId, "streak_7");
    if (a) unlocked.push(a);
  }
  if (user.level >= 5) {
    const a = await unlockAchievement(userId, "level_5");
    if (a) unlocked.push(a);
  }
  if (user.level >= 10) {
    const a = await unlockAchievement(userId, "level_10");
    if (a) unlocked.push(a);
  }
  return unlocked;
}
