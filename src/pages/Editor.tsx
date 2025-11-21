import { Button, Group } from "@mantine/core";
import {
  addEdge,
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type FinalConnectionState,
  type InternalNode,
  type Node,
  type OnConnectEnd,
  type XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, type FC } from "react";
import { SourceNode } from "../components/nodes/SourceNode";
import { TargetNode } from "../components/nodes/TargetNode";
import { TransformNode } from "../components/nodes/TransformNode";
import type {
  ComplexField,
  ElementLikeField,
  NonPrimitiveResource,
} from "../model/type-environment-utils.ts";
import { LabelIdGenerator } from "../utils/id-generator";
import classes from "./Editor.module.css";
import "./node.css";

import { useTypeEnvironment } from "../hooks/useTypeEnvironment";
import { getNonPrimitiveType as _getNonPrimitiveType } from "../model/type-environment-utils";
import { PromptProvider, usePrompt } from "../providers/PromptProvider";
import { url, type URL } from "src-common/strict-types.ts";

const nodeTypes = {
  sourceNode: SourceNode,
  targetNode: TargetNode,
  transformNode: TransformNode,
};

export const FhirMappingFlow: FC = () => {
  const typeEnv = useTypeEnvironment();
  const { askSelect, askText } = usePrompt();

  const getNonPrimitive = useCallback(_getNonPrimitiveType(typeEnv), [
    _getNonPrimitiveType,
    typeEnv,
  ]);

  const initialNodes: Node[] = [
    {
      id: "n1",
      type: "sourceNode",
      position: { x: 0, y: 0 },
      data: {
        type: getNonPrimitive(
          url("http://hl7.org/fhir/StructureDefinition/Bundle"),
        ),
      },
    },
    {
      id: "n2",
      type: "targetNode",
      position: { x: 600, y: 0 },
      data: {
        type: getNonPrimitive(
          url("http://hl7.org/fhir/StructureDefinition/Patient"),
        ),
      },
    },
    {
      id: "n2",
      type: "targetNode",
      position: { x: 900, y: 0 },
      data: {
        type: getNonPrimitive(
          url("http://hl7.org/fhir/StructureDefinition/Bundle"),
        ),
      },
    },
    {
      id: "transform1",
      type: "transformNode",
      position: { x: 400, y: 0 },
      data: { transformName: "copy" },
    },
    {
      id: "transform2",
      type: "transformNode",
      position: { x: 600, y: 0 },
      data: { transformName: "const", args: ["ciao"] },
    },
  ];

  const initialEdges: Edge[] = [
    {
      id: "n1-transform1",
      source: "n1",
      target: "transform1",
      sourceHandle: "identifier",
    },
    {
      id: "transform1-n2",
      source: "transform1",
      target: "n2",
      targetHandle: "identifier",
    },
    { id: "aaa", source: "transform2", target: "n2", targetHandle: "total" },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const { screenToFlowPosition } = useReactFlow();
  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection }, eds));
  }, []);

  const idGenerator = new LabelIdGenerator("test");

  const createNewNode = useCallback(
    (opts: {
      node: Omit<Node, "id">;
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
      const { node, attachTo } = opts;
      const id = idGenerator.getId();
      const edgeProperties =
        "source" in attachTo
          ? ({
              id,
              ...attachTo,
              target: id,
            } as {
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
            };
      setNodes((nds) => nds.concat({ ...node, id }));
      setEdges((eds) => eds.concat({ ...edgeProperties }));
    },
    [idGenerator, setNodes, setEdges],
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

        const field = parentType.fields[fieldName];

        if (
          type === "target" &&
          field.kind === "complex" &&
          getNonPrimitive(field.value)?.abstract
        ) {
          const abstractField = getNonPrimitive(field.value)!;
          const candidates = typeEnv
            .getImplementations(abstractField?.name)
            .map((x) => x.url);

          const choice = (await askSelect(candidates)) as URL | undefined;
          if (choice) {
            const choiceType = getNonPrimitive(choice);
            return createNewNode({
              node: {
                type: "targetNode",
                position: xyPos,
                data: { type: choiceType, inner: true },
                origin: [0.5, 0.0] as [number, number],
              },
              attachTo: {
                target: connectionState.fromNode!.id,
                targetHandle: connectionState.fromHandle!.id!,
              },
            });
          }
        }

        if (field.kind === "complex" || field.kind === "backbone-element") {
          createNewNode({
            node: {
              type: type + "Node",
              position: xyPos,
              data: { type: field, inner: true },
              origin: [0.5, 0.0] as [number, number],
            },
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
    [],
  );

  const onConnectEnd: OnConnectEnd = useCallback(
    async (event, connectionState) => {
      const { clientX, clientY } =
        "changedTouches" in event ? event.changedTouches[0] : event;
      const xyPos = screenToFlowPosition({ x: clientX, y: clientY });
      const { isValid, fromNode, fromHandle } = connectionState;
      // when a connection is dropped on the pane it's not valid
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
        // Handle primitive types
        // e.g.: dragging from Patient.gender, Bundle.total, etc.
        if (fromNode.type === "targetNode" && field.kind === "primitive") {
          const text = await askText("Select value");
          return createNewNode({
            node: {
              type: "transformNode",
              position: xyPos,
              data: { transformName: "const", args: [text] },
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
      }
    },
    [screenToFlowPosition],
  );

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </>
  );
};

export const Editor: FC = () => {
  return (
    <>
      <header className={classes.header}>
        <div className={classes["header-inner"]}>
          <Group gap={5}>
            {["File", "Edit", "View", "Preview"].map((item) => (
              <Button variant="subtle" key={item} c="dark" fw="normal">
                {" "}
                {item}
              </Button>
            ))}
          </Group>
        </div>
      </header>
      <div className={classes.main}>
        <PromptProvider>
          <ReactFlowProvider>
            <FhirMappingFlow />
          </ReactFlowProvider>
        </PromptProvider>
      </div>
    </>
  );
};
