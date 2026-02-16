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
    return <BaseEdge id={id} path={edgePath} />;
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: "#9ca3af", strokeWidth: 1.5 }}
      />

      <EdgeLabelRenderer>
        <div
          className="nodrag nopan"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            background: "white",
            padding: "4px 8px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            color: "#374151",
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            pointerEvents: "all",
            whiteSpace: "nowrap",
          }}
        >
          {data.condition}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};