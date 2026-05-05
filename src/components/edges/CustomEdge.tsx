import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import type { FC } from "react";

type CustomEdgeData = {
  condition?: string;
};

type CustomEdgeType = Edge<CustomEdgeData, "customEdge">;

const EDGE_STYLES = {
  base: { stroke: "#9ca3af", strokeWidth: 1.5 },
  highlighted: { stroke: "#3b82f6", strokeWidth: 2 },
  dashed: { strokeDasharray: "5,5" },
} as const;

const LABEL_STYLES: React.CSSProperties = {
  position: "absolute",
  background: "white",
  padding: "4px 8px",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 500,
  color: "#374151",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  pointerEvents: "all",
  whiteSpace: "nowrap",
  border: "1px solid #e5e7eb",
  transition: "all 0.2s ease",
};

export const CustomEdge: FC<EdgeProps<CustomEdgeType>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}) => {
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  if (!data?.condition) {
    return <BaseEdge id={id} path={edgePath} style={EDGE_STYLES.base} />;
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={EDGE_STYLES.base} />

      <EdgeLabelRenderer>
        <div
          className="nodrag nopan edge-label"
          style={{
            ...LABEL_STYLES,
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {data.condition}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};