import { Button, Group } from "@mantine/core";
import { useCallback, useContext, type FC } from "react";
import classes from './Editor.module.css';
import '@xyflow/react/dist/style.css';
import { addEdge, Background, Controls, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState, useReactFlow, type Connection, type ConnectionState, type Edge, type FinalConnectionState, type InternalNode, type Node, type OnConnectEnd, type XYPosition } from "@xyflow/react";
import { SourceNode } from "../components/SourceNode";
import { TargetNode } from "../components/TargetNode";
import './node.css';
import { LabelIdGenerator } from "../utils/id-generator";
import { TransformNode } from "../components/TransformNode";
import { TargetInnerNode } from "../components/TargetInnerNode";
import { TypeDefContext } from "../store/TypeDefContext";
import type { ComplexElement, DomainResource, FieldDef, TypeDef } from "../utils/types";


const nodeTypes = {
  sourceNode: SourceNode,
  targetNode: TargetNode,
  transformNode: TransformNode,
}

export const FhirMappingFlow: FC = () => {
  const typeDefMap = useContext(TypeDefContext);

  const initialNodes: Node[] = [
    { id: 'n1', type: "sourceNode", position: { x: 0, y: 0 }, data: { type: typeDefMap['Bundle'] } },
    { id: 'n2', type: "targetNode", position: { x: 600, y: 0 }, data: { type: typeDefMap['Patient'] } },
    { id: 'n2', type: "targetNode", position: { x: 900, y: 0 }, data: { type: typeDefMap['Bundle'] } },
    { id: 'transform1', type: "transformNode", position: { x: 400, y: 0 }, data: { transformName: 'copy' } }
  ];

  const initialEdges: Edge[] = [
    { id: 'n1-transform1', source: 'n1', target: 'transform1', sourceHandle: "anonymousId" },
    { id: 'transform1-n2', source: 'transform1', target: 'n2', targetHandle: "identifier" }
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const { screenToFlowPosition } = useReactFlow();
  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection }, eds))
  }, [])

  console.log(nodes)

  const idGenerator = new LabelIdGenerator("test")

  const onSourceNodeConnectEnd = useCallback(
    (xyPos: XYPosition, connectionState: FinalConnectionState<InternalNode>) => {
      if (connectionState.fromNode !== null && connectionState.fromHandle !== null) {
        const parentTypeDef = connectionState.fromNode.data.type as DomainResource | ComplexElement;
        const field = connectionState.fromHandle.id as string;
        const id = idGenerator.getId();

        const fieldDef = parentTypeDef.fields[field];
        if (fieldDef.type === "Complex" || fieldDef.type === "BackboneElement") {
          const newNode = {
            id,
            type: 'sourceNode',
            position: xyPos,
            data: { type: fieldDef, inner: true },
            origin: [0.5, 0.0] as [number, number],
          };

          setNodes((nds) => nds.concat(newNode));
          setEdges((eds) =>
            eds.concat({
              id,
              source: connectionState.fromNode.id,
              sourceHandle: connectionState.fromHandle.id,
              target: id,
            }),
          );
        }
      }
    }, []);

  const onSourceInnerNodeConnectEnd = useCallback(
    (xyPos: XYPosition, connectionState: FinalConnectionState<InternalNode>) => {
      if (connectionState.fromNode !== null && connectionState.fromHandle !== null) {
        const parentTypeDef = connectionState.fromNode.data.type as FieldDef;
        const field = connectionState.fromHandle.id as string;
        const id = idGenerator.getId();

        if ('fields' in parentTypeDef) {
          const fieldDef = parentTypeDef.fields[field];
          if (fieldDef.type === "Complex" || fieldDef.type === "BackboneElement") {
            const newNode = {
              id,
              type: 'sourceNode',
              position: xyPos,
              data: { type: fieldDef, inner: true },
              origin: [0.5, 0.0] as [number, number],
            };

            setNodes((nds) => nds.concat(newNode));
            setEdges((eds) =>
              eds.concat({
                id,
                source: connectionState.fromNode.id,
                sourceHandle: connectionState.fromHandle.id,
                target: id,
              }),
            );
          }
        }
      }
    }, []);

  const onTargetNodeConnectEnd = useCallback(
    (xyPos: XYPosition, connectionState: FinalConnectionState<InternalNode>) => {
      if (connectionState.fromNode !== null && connectionState.fromHandle !== null) {
        const parentTypeDef = connectionState.fromNode.data.type as DomainResource | ComplexElement;
        const field = connectionState.fromHandle.id as string;
        const id = idGenerator.getId();

        const fieldDef = parentTypeDef.fields[field];
        if (fieldDef.type === "Complex" || fieldDef.type === "BackboneElement") {
          const newNode = {
            id,
            type: 'targetNode',
            position: xyPos,
            data: { type: fieldDef, inner: true },
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
        }
      }
    }, []);

  const onTargetInnerNodeConnectEnd = useCallback(
    (xyPos: XYPosition, connectionState: FinalConnectionState<InternalNode>) => {
      if (connectionState.fromNode !== null && connectionState.fromHandle !== null) {
        const parentTypeDef = connectionState.fromNode.data.type as FieldDef;
        const field = connectionState.fromHandle.id as string;
        const id = idGenerator.getId();

        if (parentTypeDef && 'fields' in parentTypeDef) {
          const fieldDef = parentTypeDef.fields[field];
          if (fieldDef.type === "Complex" || fieldDef.type === "BackboneElement") {
            const newNode = {
              id,
              type: 'targetNode',
              position: xyPos,
              data: { type: fieldDef, inner: true },
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
          }
        }
      }
    }, [])

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      const { clientX, clientY } =
        'changedTouches' in event ? event.changedTouches[0] : event;
      const xyPos = screenToFlowPosition({ x: clientX, y: clientY });
      const {isValid, fromNode, fromHandle} = connectionState;
      // when a connection is dropped on the pane it's not valid
      if (!isValid) {
        if (fromNode === null || fromHandle === null) return;
        const t = (fromNode.data.type as DomainResource)
        const field = t.fields[fromHandle.id!];
        if (fromNode.type === "targetNode" && field.type === "Primitive") {
            const id = idGenerator.getId();
            const newNode = {
              id,
              type: 'transformNode',
              position: xyPos,
              data: { transformName: 'const' },
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
        if (fromNode.type === "targetNode" &&
          fromNode.data.inner
        ) {
          onTargetInnerNodeConnectEnd(xyPos, connectionState)
        } else if (fromNode.type === "targetNode") {
          onTargetNodeConnectEnd(xyPos, connectionState)
        } else if (fromNode.type === "sourceNode" && fromNode.data.inner) {
          onSourceInnerNodeConnectEnd(xyPos, connectionState);
        } else if (fromNode.type === "sourceNode") {
          onSourceNodeConnectEnd(xyPos, connectionState);
        } 
        // else if (connectionState.fromNode?.type === "targetNode" &&
        //   connectionState.fromHandle?.id) {

        //   } 
      }
    },
    [screenToFlowPosition],
  );

  return (
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
        <ReactFlowProvider>
          <FhirMappingFlow />
        </ReactFlowProvider>
      </div>
    </>
  );
};