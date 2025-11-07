import { Button, Group, Modal, rem, TextInput } from "@mantine/core";
import { useCallback, useContext, useState, type FC, type FormEvent } from "react";
import classes from './Editor.module.css';
import '@xyflow/react/dist/style.css';
import { addEdge, Background, Controls, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState, useReactFlow, type Connection, type Edge, type FinalConnectionState, type InternalNode, type Node, type OnConnectEnd, type UseNodesInitializedOptions, type XYPosition } from "@xyflow/react";
import { SourceNode } from "../components/nodes/SourceNode";
import { TargetNode } from "../components/nodes/TargetNode";
import './node.css';
import { LabelIdGenerator } from "../utils/id-generator";
import { TransformNode } from "../components/nodes/TransformNode";
import { TypeDefContext } from "../store/TypeDefContext";
import type { ComplexField, ElementLikeField, Field, NonPrimitiveResource, Resource } from "../utils/fhir-types";
import { useDisclosure } from "@mantine/hooks";
import { PromptProvider, usePrompt } from "../store/PromptProvider";
import { FhirTypesHierarchyImpl } from "../utils/fhir-types-hierarchy";

const nodeTypes = {
  sourceNode: SourceNode,
  targetNode: TargetNode,
  transformNode: TransformNode,
}

type SuspendedTransform = 
  | { type: "const", node: Node, target: string, targetHandle: string }

export const FhirMappingFlow: FC = () => {
  const typeDefMap = useContext(TypeDefContext);
  const fhirTypeHierarchy = new FhirTypesHierarchyImpl(typeDefMap);
  const {
    askMulti,
    askSelect,
    askText,
    modalProps
  } = usePrompt();

  const initialNodes: Node[] = [
    { id: 'n1', type: "sourceNode", position: { x: 0, y: 0 }, data: { type: typeDefMap.getNonPrimitive('Bundle') } },
    { id: 'n2', type: "targetNode", position: { x: 600, y: 0 }, data: { type: typeDefMap.getNonPrimitive('Patient') } },
    { id: 'n2', type: "targetNode", position: { x: 900, y: 0 }, data: { type: typeDefMap.getNonPrimitive('Bundle') } },
    { id: 'transform1', type: "transformNode", position: { x: 400, y: 0 }, data: { transformName: 'copy' } },
    { id: 'transform2', type: "transformNode", position: { x: 600, y: 0 }, data: { transformName: 'const', args: ["ciao"] } }
  ];

  const initialEdges: Edge[] = [
    { id: 'n1-transform1', source: 'n1', target: 'transform1', sourceHandle: "identifier" },
    { id: 'transform1-n2', source: 'transform1', target: 'n2', targetHandle: "identifier" },
    { id: 'aaa', source: 'transform2', target: 'n2', targetHandle: "total" }
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const { screenToFlowPosition } = useReactFlow();
  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection }, eds))
  }, [])

  const idGenerator = new LabelIdGenerator("test")

  const onNodeConnect = useCallback(
    async (xyPos: XYPosition, connectionState: FinalConnectionState<InternalNode>, opts: { type: 'source' | 'target'}) => {
      const {type} = opts;
      if (connectionState.fromNode !== null && connectionState.fromHandle !== null) {
        const parentType = connectionState.fromNode.data.type as ElementLikeField | NonPrimitiveResource;
        const fieldName = connectionState.fromHandle.id as string;
        const id = idGenerator.getId();

        const field = parentType.fields[fieldName];

        if (type === "target" && field.kind === "complex" && typeDefMap.getNonPrimitive(field.value)?.abstract) {
          const abstractField = typeDefMap.getNonPrimitive(field.value)!;
          const candidates = fhirTypeHierarchy.getImplementations(abstractField?.name)

          const choice = await askSelect(candidates);
          if (choice) {
            const choiceType = typeDefMap.getNonPrimitive(choice);
            const newNode = {
              id,
              type: "targetNode",
              position: xyPos,
              data: { type: choiceType, inner: true },
              origin: [0.5, 0.0] as [number, number]
            }
            console.log('User selected: ', choice)
            setNodes((nds) => nds.concat(newNode));
            setEdges((eds) => eds.concat({
                id,
                target: connectionState.fromNode.id,
                targetHandle: connectionState.fromHandle.id,
                source: id,
              }))
              
            return;
          }
        }


        if (field.kind === "complex" || field.kind === "backbone-element") {
          const newNode = {
            id,
            type: type + 'Node',
            position: xyPos,
            data: { type: field, inner: true },
            origin: [0.5, 0.0] as [number, number],
          };

          setNodes((nds) => nds.concat(newNode));
          setEdges((eds) => {
            if (type === "target") {
              return eds.concat({
                id,
                target: connectionState.fromNode.id,
                targetHandle: connectionState.fromHandle.id,
                source: id,
              })
            } else {
              return eds.concat({
                id,
                source: connectionState.fromNode.id,
                sourceHandle: connectionState.fromHandle.id,
                target: id,
              })
            }
          }
          );
        }
      }
    }, 
    []
  )

  const onConnectEnd: OnConnectEnd = useCallback(
    async (event, connectionState) => {
      const { clientX, clientY } =
        'changedTouches' in event ? event.changedTouches[0] : event;
      const xyPos = screenToFlowPosition({ x: clientX, y: clientY });
      const {isValid, fromNode, fromHandle} = connectionState;
      // when a connection is dropped on the pane it's not valid
      if (!isValid) {
        if (fromNode === null || fromHandle === null) return;
        if (fromNode.type === "transformNode") return;
        const type = fromNode.data.type as NonPrimitiveResource | ElementLikeField | ComplexField;
        const fields = type.kind === "complex" ? typeDefMap.getNonPrimitive(type.value)!.fields : type.fields;
        const field = fields[fromHandle.id!]
        // Handle primitive types
        // e.g.: dragging from Patient.gender, Bundle.total, etc.
        if (fromNode.type === "targetNode" && field.kind === "primitive") {
          const id = idGenerator.getId();
          const text = await askText("Select value")
          const newNode = {
            id,
            type: 'transformNode',
            position: xyPos,
            data: { transformName: 'const', args: [text] },
            origin: [0.5, 0.0] as [number, number],
          };
          setNodes((nds) => nds.concat(newNode));
          setEdges((eds) =>
            eds.concat({
              id,
              target: connectionState.fromNode.id,
              targetHandle: connectionState.fromHandle.id,
              source: id,
            }),
          );
          return;
        }
        if (fromNode.type === "targetNode") {
          onNodeConnect(xyPos, connectionState, { type: 'target'})
        } else if (fromNode.type === "sourceNode") {
          onNodeConnect(xyPos, connectionState, { type: 'source'})
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
  )
};


export const Editor: FC = () => {
  return (
    <>
      <header className={classes.header}>
        <div className={classes.inner}>
          <Group gap={5}>
            {["File", "Edit", "View", "Preview"].map(item =>
              <Button variant="subtle" key={item} c="dark" fw="normal"> {item}</Button>
            )}
          </Group>
        </div>
      </header>
      <div style={{ height: 'calc(100vh - 56px)', width: '100%' }}>
        <PromptProvider>
          <ReactFlowProvider>
            <FhirMappingFlow />
          </ReactFlowProvider>
        </PromptProvider>
      </div>
    </>
  );
};
