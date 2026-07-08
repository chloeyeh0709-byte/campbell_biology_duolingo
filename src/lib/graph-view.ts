import { db } from "@/lib/db";

export interface GraphNode {
  id: string;
  name: string;
  summary: string;
  importance: number;
  difficulty: number;
  tags: string[];
  masteryScore: number;
  masteryStatus: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
  weight: number;
}

export async function getConceptGraph(courseId: string, userId: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const [concepts, edges, masteryRows] = await Promise.all([
    db.concept.findMany({ where: { courseId } }),
    db.conceptEdge.findMany({ where: { courseId } }),
    db.userConceptMastery.findMany({ where: { userId, concept: { courseId } } }),
  ]);

  const masteryByConcept = new Map(masteryRows.map((m) => [m.conceptId, m]));

  return {
    nodes: concepts.map((c) => ({
      id: c.id,
      name: c.name,
      summary: c.summary,
      importance: c.importance,
      difficulty: c.difficulty,
      tags: c.tags ? c.tags.split(",").filter(Boolean) : [],
      masteryScore: masteryByConcept.get(c.id)?.masteryScore ?? 0,
      masteryStatus: masteryByConcept.get(c.id)?.masteryStatus ?? "NOT_STUDIED",
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.sourceId,
      target: e.targetId,
      relationshipType: e.relationshipType,
      weight: e.weight,
    })),
  };
}
