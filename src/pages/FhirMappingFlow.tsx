import {
  Background,
  ConnectionMode,
  Controls,
  Handle,
  ReactFlow,
  useReactFlow,
  type Edge,
  type Node,
  type OnConnectEnd,
  type OnEdgesChange,
  type OnInit,
  type OnNodesChange,
} from "@xyflow/react";
import { type FC, useCallback } from "react";
import { type Field, type PrimitiveCodeField } from "src-common/fhir-types";
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
import { evaluate } from "src/language/evaluation";
import { makeId } from "src/utils/field-based-id";
import { CustomEdge } from "src/components/edges/CustomEdge";
import { url } from "src-common/strict-types";

const nodeTypes = {
  sourceNode: SourceNode,
  targetNode: TargetNode,
  transformNode: TransformNode,
  groupNode: GroupNode,
};

const edgeTypes = {
  customEdge: CustomEdge,
};

function makeEdge(nodeId: string, fromNode: Node, fromHandle: Handle) {
  const isTargetNode = fromNode.type === "targetNode";
  return isTargetNode
    ? { source: nodeId, target: fromNode.id, targetHandle: fromHandle.id }
    : { source: fromNode.id, target: nodeId, sourceHandle: fromHandle.id };
}

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
  const { askOption, askImplementation, askExpression, askAlternatives } =
    usePrompt();

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

      if (isOptionField(field) && field.valueSet !== undefined) {
        //const with options
        console.log("OptionField");
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

        const edgeId = makeId();

        ctx.addEdge({
          id: edgeId,
          type: "customEdge",
          source: nodeId,
          target: fromNode.id,
          targetHandle: fromHandle.id,
        });
        return;
      }
      if (field.kind === "primitive") {
        const { tree, value, condition } = await askExpression(
          "Insert value for this field",
        );

        console.log("Primitive edge");

        evaluate(tree, value, {
          data: {
            xyPos,
            target: fromNode!.id,
            targetHandle: fromHandle!.id!,
            condition: condition,
          },
          flow: ctx,
        });
        return;
      }

      // abstract field
      if (
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

          const nodeId = ctx.idGen.current.getId();
          ctx.addNode({
            id: nodeId,
            type: fromNode.type,
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

          const edgeId = makeId();
          const edge = makeEdge(nodeId, fromNode, fromHandle);

          ctx.addEdge({
            type: "customEdge",
            id: edgeId,
            ...edge,
          });
          return;
        }
      }
      if (field.kind === "complex" || field.kind === "backbone-element") {
        const nodeId = ctx.idGen.current.getId();
        ctx.addNode({
          id: nodeId,
          type: fromNode.type,
          position: xyPos,
          data: {
            alias: asVariableName(fromHandle.id!) + "_" + nodeId,
            type: field,
            inner: true,
            expand: true,
            groupName: ctx.activeTab,
          },
          origin: [0.5, 0.0] as [number, number],
        });
        const edgeId = makeId();

        const edge = makeEdge(nodeId, fromNode, fromHandle);
        ctx.addEdge({ id: edgeId, type: "customEdge", ...edge });
        return;
      }
      if (field.kind === "reference") {
        const referenceUrl = url(
          "http://hl7.org/fhir/StructureDefinition/Reference",
        );
        const nodeId = ctx.idGen.current.getId();
        const type = typeEnv.getType(referenceUrl);

        ctx.addNode({
          id: nodeId,
          type: fromNode.type,
          position: xyPos,
          data: {
            alias: asVariableName("Reference") + "_" + nodeId,
            type: { ...type, name: "Reference" },
            inner: true,
            expand: true,
            groupName: ctx.activeTab,
          },
          origin: [0.5, 0.0] as [number, number],
        });
        const edgeId = makeId();
        ctx.addEdge({
          id: edgeId,
          type: "customEdge",
          source: nodeId,
          target: fromNode.id,
          targetHandle: fromHandle.id,
        });
        return;
      }
      if (field.kind === "alternatives" && !connectionState.toHandle) {
        const objectsToCreate = field.value
          .filter((v) => ["complex"].includes(v.kind))
          .map((v) => (v.kind === "complex" ? v.value : ""));

        const { tree, value, option } = await askAlternatives(
          "Choose value for this field",
          objectsToCreate,
        );
        if (value && tree) {
          evaluate(tree, value, {
            data: {
              xyPos,
              target: fromNode!.id,
              targetHandle: fromHandle!.id!,
            },
            flow: ctx,
          });
        } else if (option) {
          const nodeId = ctx.idGen.current.getId();
          const type = field.value.find(
            (fValue) => fValue.kind === "complex" && fValue.value === option,
          );
          ctx.addNode({
            id: nodeId,
            type: fromNode.type,
            position: xyPos,
            data: {
              alias: asVariableName(option) + "_" + nodeId,
              type: { ...type, name: option },
              inner: true,
              expand: true,
              groupName: ctx.activeTab,
            },
            origin: [0.5, 0.0] as [number, number],
          });
          const edgeId = makeId();
          ctx.addEdge({
            id: edgeId,
            type: "customEdge",
            source: nodeId,
            target: fromNode.id,
            targetHandle: fromHandle.id,
          });
          return;
        }
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

      console.log("Connection State: ", connectionState);

      if (fromNode === null) return;
      else if (!isValid) return onDroppedEdge(event, connectionState);

      else if (
        fromNode.type === "transformNode" ||
        toNode?.type === "transformNode"
      ) {
        ctx.addEdge({
          id: toNode?.id + "." + toHandle?.id,
          type: "customEdge",
          source: fromNode.id,
          sourceHandle: fromHandle?.id,
          target: toNode?.id ?? "",
          targetHandle: toHandle?.id,
        });
        return;
      }

      else if (fromNode.type === "sourceNode" && toNode?.type === "targetNode") {
        const { tree, value, condition } = await askExpression(
          "Copy value",
          fromNode?.data.alias + (fromHandle?.id ? "." + fromHandle?.id : ""),
        );

        evaluate(tree, value, {
          data: {
            xyPos,
            target: toNode.id,
            targetHandle: toHandle?.id!,
            condition: condition,
          },
          flow: ctx,
        });

        ctx.addConditionToEdge(
          {
            id: "",
            source: fromNode.id,
            sourceHandle: fromHandle?.id,
            target: toNode?.id,
            targetHandle: toHandle?.id,
          },
          condition,
        );
        return;
      }
      else if (toNode?.type === "groupNode" || fromNode.type === "groupNode") {

        const edge = {
          source: fromNode.id,
          sourceHandle: fromHandle?.id,
          target: toNode?.id,
          targetHandle: toHandle?.id,
        }

        const newEdge: Edge = {
          id: makeId(),
          type: "customEdge",
          source: edge.source!,
          sourceHandle: edge.sourceHandle,
          target: edge.target!,
          targetHandle: edge.targetHandle,
        }

        ctx.addEdge(newEdge);
      }
      //fromNode.type === "targetNode" && toNode?.type === "sourceNode"
      else if (toNode?.type === "sourceNode") {
        const { tree, value, condition } = await askExpression(
          "Copy value",
          toNode?.data.alias + (toHandle?.id ? "." + toHandle?.id : ""),
        );

        //console.log("EL CONDICIO: ", condition);

        evaluate(tree, value, {
          data: {
            xyPos,
            target: fromNode.id,
            targetHandle: fromHandle?.id!,
            condition: condition,
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
        id: `${group.id}${group.groupName}`,
        type: "groupNode",
        position,
        data: {
          alias: group.id,
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
        connectionMode={ConnectionMode.Loose}
        edges={edges}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
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
