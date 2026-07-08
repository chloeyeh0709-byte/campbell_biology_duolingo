"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import cytoscape from "cytoscape";
import type { GraphEdge, GraphNode } from "@/lib/graph-view";

const MASTERY_COLOR: Record<string, string> = {
  NOT_STUDIED: "#afafaf",
  STRUGGLING: "#ff4b4b",
  NEEDS_IMPROVEMENT: "#ffc800",
  MASTERED: "#58cc02",
};

const SOLID_RELATIONS = new Set(["PREREQUISITE", "PART_OF"]);

export function KnowledgeGraph({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const elements = useMemo(
    () => [
      ...nodes.map((n) => ({
        data: {
          id: n.id,
          label: n.name,
          bgColor: MASTERY_COLOR[n.masteryStatus] ?? "#afafaf",
          size: 24 + n.importance * 40,
        },
      })),
      ...edges.map((e) => ({
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          lineStyle: SOLID_RELATIONS.has(e.relationshipType) ? "solid" : "dashed",
        },
      })),
    ],
    [nodes, edges]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "font-size": 10,
            "text-wrap": "wrap",
            "text-max-width": "80px",
            color: "#1b1b1d",
            "background-color": "data(bgColor)",
            width: "data(size)",
            height: "data(size)",
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": "#c7c9d1",
            "curve-style": "bezier",
            // cytoscape supports "data(...)" mappers for line-style at runtime even
            // though its TS types only model the literal union.
            "line-style": "data(lineStyle)" as cytoscape.Css.LineStyle,
          },
        },
      ],
      layout: { name: "cose", animate: false },
    });

    cy.on("tap", "node", (evt) => {
      const id = evt.target.id();
      const node = nodes.find((n) => n.id === id) ?? null;
      setSelected(node);
    });

    return () => {
      cy.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements]);

  return (
    <div className="flex flex-1 flex-col gap-4 lg:flex-row">
      <div ref={containerRef} className="card-duo flex-1 overflow-hidden" style={{ minHeight: 480 }} />

      <aside className="card-duo w-full p-5 lg:w-80">
        {selected ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-extrabold">{selected.name}</h3>
            <p className="text-sm">{selected.summary}</p>
            <div className="flex flex-wrap gap-1">
              {selected.tags.map((t) => (
                <span key={t} className="rounded-full bg-[var(--border)] px-2 py-0.5 text-xs">
                  {t}
                </span>
              ))}
            </div>
            <p className="mt-2 text-sm font-semibold" style={{ color: MASTERY_COLOR[selected.masteryStatus] }}>
              熟練度：{Math.round(selected.masteryScore * 100)}% ({selected.masteryStatus})
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--gray)]">點擊節點查看概念詳情。顏色代表你的熟練程度，實線代表先決/從屬關係，虛線代表相關/延伸/對比關係。</p>
        )}
      </aside>
    </div>
  );
}
