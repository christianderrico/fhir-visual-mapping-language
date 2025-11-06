import { Button, Group, Modal, rem, TextInput } from "@mantine/core";
import { useCallback, useContext, useState, type FC, type FormEvent } from "react";
import classes from './Editor.module.css';
import '@xyflow/react/dist/style.css';
import { addEdge, Background, Controls, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState, useReactFlow, type Connection, type Edge, type FinalConnectionState, type InternalNode, type Node, type OnConnectEnd, type UseNodesInitializedOptions, type XYPosition } from "@xyflow/react";
import { SourceNode } from "../components/SourceNode";
import { TargetNode } from "../components/TargetNode";
import './node.css';
import { LabelIdGenerator } from "../utils/id-generator";
import { TransformNode } from "../components/TransformNode";
import { TypeDefContext } from "../store/TypeDefContext";
import type { ComplexField, ElementLikeField, Field, NonPrimitiveResource, Resource } from "../utils/fhir-types";
import { useDisclosure } from "@mantine/hooks";

const nodeTypes = {
  sourceNode: SourceNode,
  targetNode: TargetNode,
  transformNode: TransformNode,
}

type SuspendedTransform = 
  | { type: "const", node: Node, target: string, targetHandle: string }

export const FhirMappingFlow: FC = () => {
  const typeDefMap = useContext(TypeDefContext);
  const [opened, { open, close }] = useDisclosure(false);
  const [modalText, setModalText] = useState("");

  const [suspendedTransform, setSuspendedTransform] = useState<SuspendedTransform | undefined>(undefined);

  const onChangeModalText = (e: React.ChangeEvent<HTMLInputElement>) => {
    setModalText(e.target.value);
  } 

  const onModalSubmit = (e: React.FormEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (!suspendedTransform) throw new Error("Illegal state");
    switch(suspendedTransform.type) {
      case "const":
        suspendedTransform.node.data.args = [modalText]
        setNodes((nds) => nds.concat(suspendedTransform.node));
        setEdges((eds) =>
          eds.concat({
            id: suspendedTransform.node.id,
            target: suspendedTransform.target,
            targetHandle: suspendedTransform.targetHandle,
            source: suspendedTransform.node.id,
          }),
        );
        setModalText("");
        close();

    }
  }

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

  const { screenToFlowPosition, getNode } = useReactFlow();
  const onConnect = useCallback((connection: Connection) => {

    // open();
    setEdges((eds) => addEdge({ ...connection }, eds))
  }, [])

  // console.log(nodes)

  const idGenerator = new LabelIdGenerator("test")

  const onSourceNodeConnectEnd = useCallback(
    (xyPos: XYPosition, connectionState: FinalConnectionState<InternalNode>) => {
      if (connectionState.fromNode !== null && connectionState.fromHandle !== null) {
        const parentTypeDef = connectionState.fromNode.data.type as ElementLikeField;
        const field = connectionState.fromHandle.id as string;
        const id = idGenerator.getId();

        const fieldDef = parentTypeDef.fields[field];
        if (fieldDef.kind === "complex" || fieldDef.kind === "backbone-element") {
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
        const parentTypeDef = connectionState.fromNode.data.type as ElementLikeField;
        const field = connectionState.fromHandle.id as string;
        const id = idGenerator.getId();

        if ('fields' in parentTypeDef) {
          const fieldDef = parentTypeDef.fields[field];
          if (fieldDef.kind === "complex" || fieldDef.kind === "backbone-element") {
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

  const onNodeConnect = useCallback(
    (opts: { type: 'source' | 'target'}) =>
    (xyPos: XYPosition, connectionState: FinalConnectionState<InternalNode>) => {
      const {type} = opts;
      if (connectionState.fromNode !== null && connectionState.fromHandle !== null) {
        const parentTypeDef = connectionState.fromNode.data.type as ElementLikeField | NonPrimitiveResource;
        const field = connectionState.fromHandle.id as string;
        const id = idGenerator.getId();

        const fieldDef = parentTypeDef.fields[field];
        if (fieldDef.kind === "complex" || fieldDef.kind === "backbone-element") {
          const newNode = {
            id,
            type: type + 'Node',
            position: xyPos,
            data: { type: fieldDef, inner: true },
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

  const onTargetNodeConnectEnd = useCallback(
    (xyPos: XYPosition, connectionState: FinalConnectionState<InternalNode>) => {
      if (connectionState.fromNode !== null && connectionState.fromHandle !== null) {
        const parentTypeDef = connectionState.fromNode.data.type as ElementLikeField;
        const field = connectionState.fromHandle.id as string;
        const id = idGenerator.getId();

        const fieldDef = parentTypeDef.fields[field];
        if (fieldDef.kind === "complex" || fieldDef.kind === "backbone-element") {
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
        const parentTypeDef = connectionState.fromNode.data.type as ElementLikeField;
        const field = connectionState.fromHandle.id as string;
        const id = idGenerator.getId();

        if (parentTypeDef && 'fields' in parentTypeDef) {
          const fieldDef = parentTypeDef.fields[field];
          console.log(fieldDef)

          if (fieldDef.kind === "complex" && typeDefMap.getNonPrimitive(fieldDef.value)?.abstract) {
            console.log("abstract!")
          }


          if (fieldDef.kind === "complex" || fieldDef.kind === "backbone-element") {
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
        if (fromNode.type === "transformNode") return;
        const type = fromNode.data.type as NonPrimitiveResource | ElementLikeField | ComplexField;
        const fields = type.kind === "complex" ? typeDefMap.getNonPrimitive(type.value)!.fields : type.fields;
        const field = fields[fromHandle.id!]
        // Handle primitive types
        // e.g.: dragging from Patient.gender, Bundle.total, etc.
        if (fromNode.type === "targetNode" && field.kind === "primitive") {
          const id = idGenerator.getId();
          console.log(field)


          const newNode = {
            id,
            type: 'transformNode',
            position: xyPos,
            data: { transformName: 'const', args: ["ciao"] },
            origin: [0.5, 0.0] as [number, number],
          };
          setSuspendedTransform({
            type: "const",
            node: newNode,
            target: connectionState.fromNode!.id,
            targetHandle: connectionState.fromHandle!.id!,
          })
          open();
          //
          // setNodes((nds) => nds.concat(newNode));
          // setEdges((eds) =>
          //   eds.concat({
          //     id,
          //     target: connectionState.fromNode.id,
          //     targetHandle: connectionState.fromHandle.id,
          //     source: id,
          //   }),
          // );
          return;
        }
        if (fromNode.type === "targetNode" &&
          fromNode.data.inner
        ) {
          onNodeConnect({ type: 'target'})(xyPos, connectionState)
          // onTargetInnerNodeConnectEnd(xyPos, connectionState)
        } else if (fromNode.type === "targetNode") {
          onNodeConnect({ type: 'target'})(xyPos, connectionState)
          // onTargetNodeConnectEnd(xyPos, connectionState)
        } else if (fromNode.type === "sourceNode" && fromNode.data.inner) {
          onNodeConnect({ type: 'source'})(xyPos, connectionState)
          // onSourceInnerNodeConnectEnd(xyPos, connectionState);
        } else if (fromNode.type === "sourceNode") {
          onNodeConnect({ type: 'source'})(xyPos, connectionState)
          // onSourceNodeConnectEnd(xyPos, connectionState);
        } 
        // else if (connectionState.fromNode?.type === "targetNode" &&
        //   connectionState.fromHandle?.id) {

        //   } 
      }
    },
    [screenToFlowPosition],
  );

  return (
    <>
      <Modal component="form" opened={opened} onClose={close} title="Select Value" onSubmit={onModalSubmit}>
        <TextInput data-autofocus mb={rem(16)} placeholder="First input" value={modalText} onChange={onChangeModalText} />
        <Group gap={rem(16)} justify="end">
          <Button variant="white" color="red" onClick={close}>Cancel</Button>
          <Button type="submit" >Confirm</Button>
        </Group>

      </Modal>
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
        <ReactFlowProvider>
          <FhirMappingFlow />
        </ReactFlowProvider>
      </div>
    </>
  );
};
