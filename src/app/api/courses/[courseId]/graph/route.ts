import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getConceptGraph } from "@/lib/graph-view";

export async function GET(_req: Request, { params }: { params: { courseId: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const graph = await getConceptGraph(params.courseId, user.id);
  return NextResponse.json(graph);
}
