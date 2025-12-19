import {
  Button,
  Card,
  Code,
  Group,
  Menu,
  Modal,
  ScrollArea,
  Tabs,
} from "@mantine/core";
import dagre from "@dagrejs/dagre";
import {
  addEdge,
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useKeyPress,
  useNodesState,
  useOnViewportChange,
  useReactFlow,
  type Connection,
  type Edge,
  type FinalConnectionState,
  type InternalNode,
  type Node,
  type OnConnectEnd,
  type OnEdgesChange,
  type OnInit,
  type OnNodesChange,
  type ReactFlowInstance,
  type Viewport,
  type XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FC,
  type SetStateAction,
} from "react";
import { SourceNode } from "../components/nodes/SourceNode";
import { TargetNode } from "../components/nodes/TargetNode";
import { TransformNode } from "../components/nodes/TransformNode";
import type {
  ComplexField,
  ElementLikeField,
  NonPrimitiveResource,
} from "../model/type-environment-utils.ts";
import { NumberIdGenerator } from "../utils/id-generator";
import classes from "./Editor.module.css";
import "./node.css";

import { useTypeEnvironment } from "../hooks/useTypeEnvironment";
import { getNonPrimitiveType as _getNonPrimitiveType } from "../model/type-environment-utils";
import { PromptProvider, usePrompt } from "../providers/PromptProvider";
import { url } from "src-common/strict-types.ts";
import { Datatype } from "src-common/fhir-types.ts";
import { useDisclosure } from "@mantine/hooks";
import { CodeHighlight } from "@mantine/code-highlight";
import {
  asVariableName,
  extractNumberFromString,
} from "src/utils/functions.ts";
import { createGraph } from "src/model/code-generation.ts";
import { parser } from "src-generated/grammar/fhir-expression-parser.ts";

const nodeTypes = {
  sourceNode: SourceNode,
  targetNode: TargetNode,
  transformNode: TransformNode,
};

function createConnectionsMap(edges: Edge[]): Map<string, string[]> {
  const map = new Map<string, string[]>();

  edges.forEach(({ source, sourceHandle, target, targetHandle }) => {
    // Funzione di utilità per aggiungere un handle alla mappa
    const addHandle = (key: string, handle: string | null | undefined) => {
      if (!handle) return;
      const handles = map.get(key) ?? [];
      handles.push(handle);
      map.set(key, handles);
    };

    addHandle(source, sourceHandle);
    addHandle(target, targetHandle);
  });

  return map;
}

export const FhirMappingFlow: FC<{
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
}> = ({
  nodes,
  setNodes,
  onNodesChange,
  edges,
  setEdges,
  onEdgesChange,
  onToggleNodeExpand,
  onInit,
  viewport,
  onViewportChange,
}) => {
  const typeEnv = useTypeEnvironment();
  const connections = createConnectionsMap(edges);
  const getNonPrimitive = useCallback(_getNonPrimitiveType(typeEnv), [
    _getNonPrimitiveType,
    typeEnv,
  ]);
  const { askText, askOption, askImplementation } = usePrompt();

  const { screenToFlowPosition } = useReactFlow();
  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
  }, []);

  const nGenerator = new NumberIdGenerator();

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
      const id = _id ?? nGenerator.getId();
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
      setNodes((nds) => nds.concat({ ...node, id }));
      setEdges((eds) => eds.concat({ ...edgeProperties }));
    },
    [nGenerator, setNodes, setEdges],
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
              const id = nGenerator.getId();
              return createNewNode({
                node: {
                  type: "targetNode",
                  position: xyPos,
                  data: {
                    type: choiceType,
                    inner: true,
                    expand: true,
                    alias: asVariableName(choiceType?.name ?? "") + "_" + id,
                    connections,
                    onToggleNodeExpand,
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
        } else if (type === "target" && field.kind === "complex") {
          console.error(
            `Couldn't find type ${field.value} in type environment`,
          );
        }

        if (field.kind === "complex" || field.kind === "backbone-element") {
          const id = nGenerator.getId();
          createNewNode({
            node: {
              type: type + "Node",
              position: xyPos,
              data: {
                alias: asVariableName(type.name ?? fieldName) + "_" + id,
                type: field,
                inner: true,
                expand: true,
                connections,
                onToggleNodeExpand,
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
    [],
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
          const opt = await askOption(opts);
          return createNewNode({
            node: {
              type: "transformNode",
              position: xyPos,
              data: {
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

        // Handle primitive types
        // e.g.: dragging from Patient.gender, Bundle.total, etc.
        if (fromNode.type === "targetNode" && field.kind === "primitive") {
          const arg = await askText("Insert value for this field");
          console.log(parser.parse(arg));
          return createNewNode({
            node: {
              type: "transformNode",
              position: xyPos,
              data: { transformName: "const", args: [arg] },
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
        console.log(connectionState.fromHandle);
        const arg = await askText(
          "Copy value",
          fromNode?.data.alias + "." + fromHandle?.id,
        );
        console.log(arg);
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
        onInit={onInit}
        viewport={viewport}
        onViewportChange={onViewportChange}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </>
  );
};

export const Editor: FC = () => {
  const typeEnv = useTypeEnvironment();
  const getNonPrimitive = useCallback(_getNonPrimitiveType(typeEnv), [
    _getNonPrimitiveType,
    typeEnv,
  ]);

  function transformNodes(mapper: (node: Node) => Node) {
    setNodes((nodes) => nodes.map(mapper));
  }

  function onToggleNodeExpand(isExpanded: boolean, id?: string) {
    transformNodes((n) => {
      if (id) {
        return n.id === id
          ? { ...n, data: { ...n.data, expand: isExpanded } }
          : n;
      }
      return { ...n, data: { ...n.data, expand: isExpanded } };
    });
  }

  const initialEdges: Edge[] = [];
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const connections = useMemo(() => {
    return createConnectionsMap(edges);
  }, [edges]);

  useEffect(() => {
    transformNodes((n) => {
      return { ...n, data: { ...n.data, connections } };
    });
  }, [connections]);

  const initialNodes: Node[] = [
    {
      id: "n1",
      type: "sourceNode",
      position: { x: 0, y: 0 },
      data: {
        type: getNonPrimitive(
          url("http://hl7.org/fhir/StructureDefinition/MotuPatient"),
        ),
        alias: "motuPatient_1",
        expand: true,
        connections,
        onToggleNodeExpand,
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
        alias: "bundle_2",
        expand: true,
        connections,
        onToggleNodeExpand,
      },
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [viewport, setViewport] = useState<Viewport | null>({
    x: 0,
    y: 0,
    zoom: 1,
  });
  const [stack, setStack] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const undoRedoLimit = 10;

  function cloneNode(node: Node) {
    return {
      ...node,
      data: {
        ...node.data,
      },
    };
  }

  useEffect(() => {
    setStack((prev) => {
      const snapshotEquals = (
        snap: { nodes: Node[]; edges: Edge[] },
        nodes: Node[],
        edges: Edge[],
      ) =>
        snap.nodes.length === nodes.length &&
        snap.nodes.every((n: Node, i: number) => n.id === nodes[i]?.id) &&
        snap.edges.length === edges.length &&
        snap.edges.every((e: Edge, i: number) => e.id === edges[i]?.id);

      const changed = prev.length > 0 && snapshotEquals(prev[0], nodes, edges);

      const updated = !changed
        ? [
            {
              nodes: [...nodes.map(cloneNode)],
              edges: structuredClone(edges),
            },
            ...prev,
          ]
        : prev;

      return updated.length > undoRedoLimit ? updated.slice(1) : updated;
    });
  }, [edges, nodes]);

  const redoPressed = useKeyPress("Control+z");

  useEffect(() => {
    if (redoPressed) {
      if (stack.length >= 2) {
        let snapshot = stack[1];
        setStack((prev) => prev.slice(1));
        snapshot.nodes = snapshot.nodes.map((n) => {
          const oldNode = nodes.find((x) => x.id === n.id);
          return {
            ...n,
            data: { ...n.data, expand: oldNode?.data.expand ?? n.data.expand },
            position: oldNode?.position ?? n.position,
          };
        });
        setNodes((nodes) => snapshot.nodes ?? nodes);
        setEdges((edges) => snapshot?.edges ?? edges);
      }
    }
  }, [redoPressed]);

  const onCollapse = () => {
    onToggleNodeExpand(false);
  };

  const onExpand = () => {
    onToggleNodeExpand(true);
  };

  const onSave = useCallback(() => {
    if (rfInstance) {
      const flow = rfInstance.toObject();
      localStorage.setItem("saved-item", JSON.stringify(flow));
    }
  }, [rfInstance]);

  const onRestore = useCallback(() => {
    const restoreFlow = async () => {
      const item = localStorage.getItem("saved-item");
      if (item !== null) {
        const flow = JSON.parse(item);

        if (flow) {
          const { x = 0, y = 0, zoom = 1 } = flow.viewport;
          setNodes(flow.nodes || []);
          setEdges(flow.edges || []);
          setViewport({ x, y, zoom });
        }
      }
    };

    restoreFlow();
  }, [setNodes, setViewport]);

  const onAutoLayout = () => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: "LR",
      align: "UL",
      ranker: "longest-path",
      nodesep: 20,
      marginx: 20,
      marginy: 30,
    });
    g.setDefaultEdgeLabel(() => ({}));

    nodes.forEach((node) => {
      g.setNode(node.id, {
        width: node.measured!.width,
        height: node.measured!.height,
      });
    });

    edges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    dagre.layout(g);
    transformNodes((n) => {
      const pos = g.node(n.id);
      return {
        ...n,
        position: {
          x: pos.x - n.measured!.width! / 2,
          y: pos.y - n.measured!.height! / 2,
        },
      };
    });
  };

  const [opened, { open, close }] = useDisclosure(false);
  const [myCodeString, setMyCodeString] = useState("");

  return (
    <>
      <header className={classes.header}>
        <div className={classes["header-inner"]}>
          <Group gap={5}>
            <Menu>
              <Menu.Target>
                <Button variant="subtle" c="dark" fw="normal">
                  File
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={onSave}>Save</Menu.Item>
                <Menu.Item onClick={onRestore}>Restore</Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <Menu>
              <Menu.Target>
                <Button variant="subtle" c="dark" fw="normal">
                  Edit
                </Button>
              </Menu.Target>
            </Menu>
            <Menu position="bottom-start" offset={12}>
              <Menu.Target>
                <Button variant="subtle" c="dark" fw="normal">
                  View
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={onExpand}>Expand nodes</Menu.Item>
                <Menu.Item onClick={onCollapse}>Collapse nodes</Menu.Item>
                <Menu.Item onClick={onAutoLayout}>Auto-layout</Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <Menu>
              <Menu.Target>
                <Button
                  variant="subtle"
                  c="dark"
                  fw="normal"
                  onClick={() => {
                    setMyCodeString(createGraph(nodes, edges));
                    open();
                  }}
                >
                  Preview
                </Button>
              </Menu.Target>
            </Menu>
          </Group>
          <Modal
            opened={opened}
            onClose={close}
            title="Preview"
            size={"auto"}
            overlayProps={{
              backgroundOpacity: 0.55,
              blur: 3,
            }}
          >
            <Card shadow="sm" radius="md" withBorder>
              <Tabs defaultValue="fml">
                <Tabs.List>
                  <Tabs.Tab value="fml">FML</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="fml" pt="xs">
                  <ScrollArea offsetScrollbars>
                    <CodeHighlight
                      code={myCodeString}
                      language="tsx"
                      withCopyButton={false}
                      withExpandButton={false}
                      styles={{
                        showCodeButton: {
                          display: "none",
                        },
                      }}
                    />
                  </ScrollArea>
                </Tabs.Panel>
              </Tabs>
            </Card>
          </Modal>
        </div>
      </header>
      <div className={classes.main}>
        <PromptProvider>
          <ReactFlowProvider>
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
          </ReactFlowProvider>
        </PromptProvider>
      </div>
    </>
  );
};
