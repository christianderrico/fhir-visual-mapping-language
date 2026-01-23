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
  addEdge,
} from "@xyflow/react";
import { type FC, useCallback, useEffect, useState } from "react";
import { Tree, TreeCursor, type SyntaxNode } from "@lezer/common";
import {
  Datatype,
  type Field,
  type PrimitiveCodeField,
} from "src-common/fhir-types";
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
import { dumpTree } from "src/language/util";
import { evaluate } from "src/language/evaluation";
import { makeId } from "src/utils/field-based-id";
import { toPlainObject } from "lodash";

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
  //
  // const {nodes, edges} = ctx.getActiveNodesAndEdges();
  // const onEdgesChange = ctx.changeEdgesByTab;
  // const onNodesChange = ctx.changeNodesByTab;

  //const [activeTab, setActiveTab] = useState(ctx.activeTab);

  const typeEnv = useTypeEnvironment();
  const getNonPrimitive = useCallback(_getNonPrimitiveType(typeEnv), [
    _getNonPrimitiveType,
    typeEnv,
  ]);
  const { askOption, askImplementation, askExpression } = usePrompt();

  const { screenToFlowPosition } = useReactFlow();
  const onConnect = useCallback(() => {}, []);

  const isOptionField = (field: Field): field is PrimitiveCodeField => {
    return (
      field.kind === "primitive" &&
      field.value === Datatype.CODE &&
      field.valueSet !== undefined &&
      field.valueSet.strength === "required"
    );
  };

  const onDroppedEdge: OnConnectEnd = useCallback(
    async (event, connectionState) => {
      const { clientX, clientY } =
        "changedTouches" in event ? event.changedTouches[0] : event;
      const { fromHandle } = connectionState;
      const fromNode = connectionState.fromNode!;
      const xyPos = screenToFlowPosition({ x: clientX, y: clientY });

      if (fromHandle === null) return;

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
        isOptionField(field) &&
        field.valueSet !== undefined
      ) {
        const candidates = typeEnv.getOptions(field.valueSet.url);
        const chosen = await askOption(Object.values(candidates));

        const nodeId = ctx.idGen.current.getId();
        ctx.addNode({
          id: nodeId,
          type: "transformNode",
          position: xyPos,
          data: {
            groupName: ctx.activeTab,
            transformName: "const",
            args: [{ datatype: Datatype.STRING, value: chosen }],
          },
          origin: [0.5, 0.0] as [number, number],
        });

        const edgeId = makeId(fromNode.id, fromHandle.id);
        ctx.addEdge({
          id: edgeId,
          source: nodeId,
          target: fromNode.id,
          targetHandle: fromHandle.id,
        });
        return;
      }
      if (fromNode.type === "targetNode" && field.kind === "primitive") {
        const { tree, value } = await askExpression(
          "Insert value for this field",
        );

        evaluate(tree, value, {
          data: {
            xyPos,
            target: fromNode!.id,
            targetHandle: fromHandle!.id!,
          },
          flow: ctx,
        });
        return;
      }

      // abstract field
      if (
        fromNode.type === "targetNode" &&
        field?.kind === "complex" &&
        getNonPrimitive(field.value) !== undefined &&
        getNonPrimitive(field.value)!.abstract
      ) {
        const abstractField = getNonPrimitive(field.value)!;
        const candidates = typeEnv
          .getImplementations(abstractField.url)
          .map((x) => x.url);

        const choice = await askImplementation(candidates);
        if (choice) {
          const choiceType = getNonPrimitive(choice);
          console.log("AGGIUNGI NODO");

          const nodeId = ctx.idGen.current.getId();
          ctx.addNode({
            id: nodeId,
            type: "targetNode",
            position: xyPos,
            data: {
              type: choiceType,
              inner: true,
              expand: true,
              alias: asVariableName(choiceType?.name ?? "") + "_" + nodeId,
              groupName: ctx.activeTab,
            },
            origin: [0.5, 0.0] as [number, number],
          });

          const edgeId = makeId(fromNode.id, fromHandle.id);
          ctx.addEdge({
            id: edgeId,
            source: nodeId,
            target: fromNode.id,
            targetHandle: fromHandle.id,
          });
          return;
        }
      }

      if (
        fromNode.type === "targetNode" &&
        (field.kind === "complex" || field.kind === "backbone-element")
      ) {
        const nodeId = ctx.idGen.current.getId();
        ctx.addNode({
          id: nodeId,
          type: "targetNode",
          position: xyPos,
          data: {
            alias: asVariableName(type.name ?? fromHandle.id!) + "_" + nodeId,
            type: field,
            inner: true,
            expand: true,
            groupName: ctx.activeTab,
          },
          origin: [0.5, 0.0] as [number, number],
        });
        const edgeId = makeId(fromNode.id, fromHandle.id);
        ctx.addEdge({
          id: edgeId,
          source: nodeId,
          target: fromNode.id,
          targetHandle: fromHandle.id,
        });
        return;
      }
    },
    [ctx],
  );

  const onConnectEnd: OnConnectEnd = useCallback(
    async (event, connectionState) => {
      const { clientX, clientY } =
        "changedTouches" in event ? event.changedTouches[0] : event;
      const xyPos = screenToFlowPosition({ x: clientX, y: clientY });
      const { isValid, fromNode, fromHandle, toNode, toHandle } =
        connectionState;

      if (fromNode === null) return;
      if (!isValid) return onDroppedEdge(event, connectionState);

      if (toNode?.type === "transformNode") {
        ctx.addEdge({
          id: toNode.id + "." + toHandle?.id,
          source: fromNode.id,
          sourceHandle: fromHandle?.id,
          target: toNode.id,
          targetHandle: toHandle?.id,
        });
        return;
      }

      if (fromNode.type === "sourceNode" && toNode?.type === "targetNode") {
        const { tree, value } = await askExpression(
          "Copy value",
          fromNode?.data.alias + (fromHandle?.id ? "." + fromHandle?.id : ""),
        );

        evaluate(tree, value, {
          data: {
            xyPos,
            target: toNode.id,
            targetHandle: toHandle?.id!,
          },
          flow: ctx,
        });
        return;
      }

      if (fromNode.type === "targetNode" && toNode?.type === "sourceNode") {
        const { tree, value } = await askExpression(
          "Copy value",
          toNode?.data.alias + (toHandle?.id ? "." + toHandle?.id : ""),
        );

        evaluate(tree, value, {
          data: {
            xyPos,
            target: fromNode.id,
            targetHandle: fromHandle?.id!,
          },
          flow: ctx,
        });
        return;
      }
    },
    [ctx],
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
