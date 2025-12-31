import { useCallback, type Dispatch, type SetStateAction } from "react";
import { PromptProvider } from "src/providers/PromptProvider.tsx";
import { FhirMappingFlow } from "src/pages/Editor.tsx";
import {
  useReactFlow,
  type Edge,
  type Node,
  type OnNodesChange,
  type OnEdgesChange,
  type OnInit,
  type Viewport,
} from "@xyflow/react";
import type { Tab } from "./EditorTabs";

interface FlowTabContentProps {
  tab: Tab;
  nodes: Node[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  onNodesChange: OnNodesChange;
  edges: Edge[];
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  onEdgesChange: OnEdgesChange;
  onToggleNodeExpand: (isExpanded: boolean, id?: string) => void;
  onInit: OnInit;
  viewport: Viewport;
  onViewportChange: (viewport: Viewport) => void;
}

export function FlowTabContent(props: FlowTabContentProps) {
  const {
    tab,
    nodes,
    setNodes,
    edges,
    setEdges,
    onToggleNodeExpand,
    onNodesChange,
    onEdgesChange,
  } = props;
  const { screenToFlowPosition } = useReactFlow();

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `node-${tab.id}-${Date.now()}`,
        type: "default",
        position,
        data: { label: `${type} node` },
      };

      onNodesChange([{ type: "add", item: newNode }], tab.id);
    },
    [screenToFlowPosition, tab.id, onNodesChange],
  );

  return (
    <PromptProvider>
      <FhirMappingFlow
        nodes={nodes}
        setNodes={setNodes}
        onNodesChange={onNodesChange}
        edges={edges}
        setEdges={setEdges}
        onEdgesChange={onEdgesChange}
        onToggleNodeExpand={onToggleNodeExpand}
        onInit={setRfInstance}
        viewport={viewport}
        onViewportChange={setViewport}
      />
    </PromptProvider>
  );
}
