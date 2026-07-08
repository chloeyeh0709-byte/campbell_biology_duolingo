import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      xp: user.xp,
      level: user.level,
      streakDays: user.streakDays,
      hearts: user.hearts,
      maxHearts: user.maxHearts,
    },
  });
}
