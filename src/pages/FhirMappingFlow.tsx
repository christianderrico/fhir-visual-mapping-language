import {
  Background,
  Controls,
  ReactFlow,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type FinalConnectionState,
  type InternalNode,
  type OnConnectEnd,
  type OnEdgesChange,
  type OnInit,
  type OnNodesChange,
  type XYPosition,
} from "@xyflow/react";
import { type FC, useCallback } from "react";
import { Datatype } from "src-common/fhir-types";
import { useTypeEnvironment } from "src/hooks/useTypeEnvironment";
import type {
  ElementLikeField,
  NonPrimitiveResource,
  ComplexField,
} from "src/model/type-environment-utils";
import { usePrompt } from "src/providers/PromptProvider";
import { asVariableName } from "src/utils/functions";
import { SourceNode } from "src/components/nodes/SourceNode";
import { TargetNode } from "src/components/nodes/TargetNode";
import { TransformNode } from "src/components/nodes/TransformNode";
import { getNonPrimitiveType as _getNonPrimitiveType } from "../model/type-environment-utils";
import { useFlow } from "src/providers/FlowProvider";
import { GroupNode } from "src/components/nodes/GroupNode";

const nodeTypes = {
  sourceNode: SourceNode,
  targetNode: TargetNode,
  transformNode: TransformNode,
  groupNode: GroupNode,
};

export const FhirMappingFlow: FC<{
  nodes: Node[];
  onNodesChange: OnNodesChange;
  edges: Edge[];
  onEdgesChange: OnEdgesChange;
  onToggleNodeExpand: (isExpanded: boolean, id?: string) => void;
  onInit: OnInit;
}> = ({ nodes, onNodesChange, edges, onEdgesChange, onInit }) => {
  const ctx = useFlow();

  const typeEnv = useTypeEnvironment();
  const getNonPrimitive = useCallback(_getNonPrimitiveType(typeEnv), [
    _getNonPrimitiveType,
    typeEnv,
  ]);
  const { askText, askOption, askImplementation } = usePrompt();

  const { screenToFlowPosition } = useReactFlow();
  const onConnect = useCallback((connection: Connection) => {
    ctx.addEdge({ ...connection, animated: true } as Edge);
  }, []);

  const createNewNode = useCallback(
    (opts: {
      node: Omit<Node, "id">;
      id?: string;
      attachTo:
        | {
            target: string;
            targetHandle: string;
            source?: never;
            sourceHandle?: never;
          }
        | {
            source: string;
            sourceHandle: string;
            target?: never;
            targetHandle?: never;
          };
    }) => {
      const { node, attachTo, id: _id } = opts;
      const id = _id ?? ctx.idGen.current.getId();
      const edgeProperties =
        "source" in attachTo
          ? ({
              id,
              ...attachTo,
              animated: true,
              target: id,
            } as {
              animated: boolean;
              id: string;
              source: string;
              sourceHandle: string;
              target: string;
              targetHandle?: never;
            })
          : {
              id,
              ...attachTo,
              source: id,
              animated: true,
            };
      ctx.addNode({ ...node, id });
      ctx.addEdge({ ...edgeProperties });
    },
    [ctx, ctx.activeTab],
  );

  const onNodeConnect = useCallback(
    async (
      xyPos: XYPosition,
      connectionState: FinalConnectionState<InternalNode>,
      opts: { type: "source" | "target" },
    ) => {
      const { type } = opts;
      if (
        connectionState.fromNode !== null &&
        connectionState.fromHandle !== null
      ) {
        const parentType = connectionState.fromNode.data.type as
          | ElementLikeField
          | NonPrimitiveResource;
        const fieldName = connectionState.fromHandle.id as string;
        const field = fieldName ? parentType.fields[fieldName] : undefined;

        if (
          type === "target" &&
          field?.kind === "complex" &&
          getNonPrimitive(field.value) !== undefined
        ) {
          if (getNonPrimitive(field.value)!.abstract) {
            const abstractField = getNonPrimitive(field.value)!;
            const candidates = typeEnv
              .getImplementations(abstractField?.name)
              .map((x) => x.url);

            const choice = await askImplementation(candidates);
            if (choice) {
              const choiceType = getNonPrimitive(choice);
              const id = ctx.idGen.current.getId();
              console.log("AGGIUNGI NODO");
              return createNewNode({
                node: {
                  type: "targetNode",
                  position: xyPos,
                  data: {
                    type: choiceType,
                    inner: true,
                    expand: true,
                    alias: asVariableName(choiceType?.name ?? "") + "_" + id,
                    groupName: ctx.activeTab,
                  },
                  origin: [0.5, 0.0] as [number, number],
                },
                id,
                attachTo: {
                  target: connectionState.fromNode!.id,
                  targetHandle: connectionState.fromHandle!.id!,
                },
              });
            }
          }
        } else if (type === "target" && field?.kind === "complex") {
          console.error(
            `Couldn't find type ${field.value} in type environment`,
          );
        }

        if (field?.kind === "complex" || field?.kind === "backbone-element") {
          const id = ctx.idGen.current.getId();
          createNewNode({
            node: {
              type: type + "Node",
              position: xyPos,
              data: {
                alias: asVariableName(type.name ?? fieldName) + "_" + id,
                type: field,
                inner: true,
                expand: true,
                groupName: ctx.activeTab,
              },
              origin: [0.5, 0.0] as [number, number],
            },
            id,
            attachTo:
              type === "target"
                ? {
                    target: connectionState.fromNode!.id,
                    targetHandle: connectionState.fromHandle!.id!,
                  }
                : {
                    source: connectionState.fromNode!.id,
                    sourceHandle: connectionState.fromHandle!.id!,
                  },
          });
        }
      }
    },
    [ctx, ctx.activeTab],
  );

  const onConnectEnd: OnConnectEnd = useCallback(
    async (event, connectionState) => {
      const { clientX, clientY } =
        "changedTouches" in event ? event.changedTouches[0] : event;
      const xyPos = screenToFlowPosition({ x: clientX, y: clientY });
      const { isValid, fromNode, fromHandle } = connectionState;

      if (!isValid) {
        if (fromNode === null || fromHandle === null) return;
        if (fromNode.type === "transformNode") return;

        const type = fromNode.data.type as
          | NonPrimitiveResource
          | ElementLikeField
          | ComplexField;
        const fields =
          type.kind === "complex"
            ? getNonPrimitive(type.value)!.fields
            : type.fields;
        const field = fields[fromHandle.id!];

        if (
          fromNode.type === "targetNode" &&
          field.kind === "primitive" &&
          field.value === Datatype.CODE &&
          field.valueSet !== undefined &&
          field.valueSet.strength === "required"
        ) {
          const opts = typeEnv.getOptions(field.valueSet.url);
          const opt = await askOption(Object.values(opts));

          return createNewNode({
            node: {
              type: "transformNode",
              position: xyPos,
              data: {
                groupName: ctx.activeTab,
                transformName: "const",
                args: [{ datatype: Datatype.STRING, value: opt }],
              },
              origin: [0.5, 0.0] as [number, number],
            },
            attachTo: {
              target: connectionState.fromNode!.id,
              targetHandle: connectionState.fromHandle!.id!,
            },
          });
        }

        if (fromNode.type === "targetNode" && field.kind === "primitive") {
          const arg = await askText("Insert value for this field");
          
          return createNewNode({
            node: {
              type: "transformNode",
              position: xyPos,
              data: {
                transformName: "const",
                args: [arg],
                groupName: ctx.activeTab,
              },
              origin: [0.5, 0.0] as [number, number],
            },
            attachTo: {
              target: connectionState.fromNode!.id,
              targetHandle: connectionState.fromHandle!.id!,
            },
          });
        }
        if (fromNode.type === "targetNode") {
          onNodeConnect(xyPos, connectionState, { type: "target" });
        } else if (fromNode.type === "sourceNode") {
          onNodeConnect(xyPos, connectionState, { type: "source" });
        }
      } else {
        const arg = await askText(
          "Copy value",
          fromNode?.data.alias + (fromHandle?.id ? "." + fromHandle?.id : ""),
        );
      }
    },
    [ctx, ctx.activeTab, screenToFlowPosition],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.stopPropagation();
      const group = JSON.parse(
        event.dataTransfer.getData("application/reactflow"),
      );
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newGroupNode: Node = {
        id: group.id,
        type: "groupNode",
        position,
        data: {
          groupName: group.groupName,
          sources: group.sources,
          targets: group.targets,
        },
      };
      onNodesChange([{ type: "add", item: newGroupNode }]);
    },
    [ctx, ctx.activeTab, screenToFlowPosition, onNodesChange],
  );

  return (
    <>
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        edges={edges}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        onInit={onInit}
        fitView
      >
        <Background id={ctx.activeTab} />
        <Controls />
      </ReactFlow>
    </>
  );
};
