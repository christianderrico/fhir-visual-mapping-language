import {
  applyEdgeChanges,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type XYPosition,
} from "@xyflow/react";
import { createContext, useContext, useMemo, useRef, useState } from "react";
import type { Resource } from "src-common/fhir-types";
import { asVariableName } from "src/utils/functions";
import { NumberIdGenerator } from "src/utils/id-generator";
import dagre from "@dagrejs/dagre";

export function createConnectionsMap(edges: Edge[]): Map<string, string[]> {
  const map = new Map<string, string[]>();

  edges.forEach(({ source, sourceHandle, target, targetHandle }) => {
    if (sourceHandle) {
      map.set(source, [...(map.get(source) ?? []), sourceHandle]);
    }
    if (targetHandle) {
      map.set(target, [...(map.get(target) ?? []), targetHandle]);
    }
  });

  return map;
}

function createNode(
  resource: Resource,
  id: string,
  type: string,
  groupName: string,
  position: XYPosition,
): Node {
  return {
    id,
    type,
    position,
    data: {
      type: resource,
      alias: `${asVariableName(resource.name)}_${id}`,
      groupName,
      expand: false,
    },
  };
}

type Snapshot = {
  nodes: Node[];
  edges: Edge[];
  activeTab: string;
};

const UNDO_LIMIT = 30;

const FlowContext = createContext<ReturnType<typeof useProvideFlow> | null>(
  null,
);

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const value = useProvideFlow();
  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

function useProvideFlow() {
  const idGen = useRef<NumberIdGenerator>(new NumberIdGenerator());

  const [templateName, setTemplateName] = useState("");
  const [tabs, setTabs] = useState<Set<string>>(new Set(["Main"]));
  const [activeTab, setActiveTab] = useState("Main");

  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);

  function onAutoLayout() {
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: "LR",
      align: "UL",
      ranker: "network-simplex",
      nodesep: 80,
      marginx: 20,
      marginy: 30,
      ranksep: 120,
    });
    g.setDefaultEdgeLabel(() => ({}));

    nodesByTab.get(activeTab)?.forEach((node: Node) => {
      g.setNode(node.id, {
        width: node.measured!.width,
        height: node.measured!.height,
      });
    });

    edgesByTab.get(activeTab)?.forEach((edge: Edge) => {
      g.setEdge(edge.source, edge.target);
    });

    dagre.layout(g);
    setNodes((prev) =>
      prev.map((n) => {
        const pos = g.node(n.id);
        return pos
          ? {
              ...n,
              position: {
                x: pos.x - n.measured!.width! / 2,
                y: pos.y - n.measured!.height! / 2,
              },
            }
          : n;
      }),
    );
  }

  function addNode(node: Node) {
    setNodes((prev) => prev.concat(node));
  }

  function createSourceNode(
    resource: Resource,
    groupName: string,
    position: XYPosition,
  ): Node {
    return createNode(
      resource,
      idGen.current.getId(),
      "sourceNode",
      groupName,
      position,
    );
  }

  function createTargetNode(
    resource: Resource,
    groupName: string,
    position: XYPosition,
  ): Node {
    return createNode(
      resource,
      idGen.current.getId(),
      "targetNode",
      groupName,
      position,
    );
  }

  function addNodes(
    groupName: string,
    resources: Resource[],
    type: "sourceNode" | "targetNode",
  ) {
    if (type === "sourceNode")
      setNodes((prev) =>
        prev.concat(
          resources.map((r, i) =>
            createSourceNode(r, groupName, { x: 0, y: i * 200 }),
          ),
        ),
      );
    else
      setNodes((prev) =>
        prev.concat(
          resources.map((r, i) =>
            createTargetNode(r, groupName, { x: 700, y: i * 200 }),
          ),
        ),
      );
  }

  function addEdge(edge: Edge) {
    setEdges((prev) =>
      prev.filter((x) => x.id !== edge.id).concat({ ...edge }),
    );
  }

  function commitSnapshot() {
    undoStack.current.unshift({
      nodes: nodes.map((n) => ({ ...n, data: { ...n.data } })),
      edges: structuredClone(edges),
      activeTab,
    });

    if (undoStack.current.length > UNDO_LIMIT) {
      undoStack.current.pop();
    }

    redoStack.current = [];
  }

  function undo() {
    const snap = undoStack.current.shift();
    if (!snap) return;

    redoStack.current.unshift({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
      activeTab,
    });

    setNodes(snap.nodes);
    setEdges(snap.edges);
    setActiveTab(snap.activeTab);
  }

  function redo() {
    const snap = redoStack.current.shift();
    if (!snap) return;

    undoStack.current.unshift({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
      activeTab,
    });

    setNodes(snap.nodes);
    setEdges(snap.edges);
    setActiveTab(snap.activeTab);
  }

  const connections = useMemo(() => createConnectionsMap(edges), [edges]);

  const nodesByTab = useMemo(() => {
    const map = new Map<string, Node[]>();
    nodes.forEach((n) => {
      const g = n.data.groupName as string;
      map.set(g, [...(map.get(g) ?? []), n]);
    });
    return map;
  }, [nodes]);

  const edgesByTab = useMemo(() => {
    const map = new Map<string, Edge[]>();

    nodesByTab.forEach((ns, tab) => {
      const ids = ns.map((n) => n.id);
      map.set(
        tab,
        edges.filter((e) => ids.includes(e.source) || ids.includes(e.target)),
      );
    });

    return map;
  }, [nodesByTab, edges]);

  function startEditor(
    source: Resource,
    target: Resource,
    templateName: string,
  ) {
    commitSnapshot();

    const group = "Main";

    setTemplateName(templateName);
    setTabs(new Set([group]));
    setActiveTab(group);

    setNodes((prev) =>
      prev.concat([
        createSourceNode(source, group, { x: 0, y: 0 }),
        createTargetNode(target, group, { x: 700, y: 0 }),
      ]),
    );

    setEdges([]);
  }

  function setNodeExpanded(expand: boolean, id?: string) {
    commitSnapshot();

    setNodes((prev) =>
      prev.map((n) =>
        !id || n.id === id ? { ...n, data: { ...n.data, expand } } : n,
      ),
    );
  }

  function changeNodesByTab(changes: NodeChange[]) {
    commitSnapshot();

    setNodes((prev) => applyNodeChanges(changes, prev));
  }

  function changeEdgesByTab(changes: EdgeChange[]) {
    commitSnapshot();

    setEdges((prev) => applyEdgeChanges(changes, prev));
  }

  function addTab(name: string) {
    commitSnapshot();
    if (!tabs.has(name)) {
      setTabs((prev) => new Set([...prev, name]));
      setActiveTab(name);
      return true;
    } else {
      return false;
    }
  }

  function updateTab(
    prev: string,
    next: string,
    sources: Resource[],
    targets: Resource[],
  ) {
    setTabs((prevTabs) => {
      const nextTabs = new Set(prevTabs);
      nextTabs.delete(prev);
      nextTabs.add(next);
      setNodes((prevNodes) =>
        prevNodes.filter((n) => n.data.groupName != prev),
      );
      addNodes(next, sources, "sourceNode");
      addNodes(next, targets, "targetNode");
      return nextTabs;
    });
  }

  function renameTab(prevName: string, nextName: string) {
    commitSnapshot();
    setTabs(
      (prev) => new Set([...prev].map((p) => (p === prevName ? nextName : p))),
    );
    setNodes((nodes) =>
      nodes.map((n) => ({
        ...n,
        id: n.type === "groupNode" && n.id === prevName ? nextName : n.id,
        data: {
          ...n.data,
          groupName:
            n.data.groupName === prevName ? nextName : n.data.groupName,
        },
      })),
    );
  }

  function getGroupNodes() {
    const groups = [...tabs];

    const result = groups.reduce(
      (groupedTabs, tab) => {
        if (groupedTabs[tab] == null) groupedTabs[tab] = [];
        groupedTabs[tab].push(
          ...nodes.filter(
            (n) => n.type === "groupNode" && n.data.groupName === tab,
          ),
        );
        return groupedTabs;
      },
      {} as Record<string, Node[]>,
    );
    return result;
  }

  function removeTab(name: string) {
    commitSnapshot();

    setTabs((prev) => new Set([...prev].filter((t) => t !== name)));

    setNodes((prev) => prev.filter((n) => n.data.groupName !== name));

    setEdges((prev) =>
      prev.filter(
        (e) =>
          !nodesByTab
            .get(name)
            ?.some((n) => n.id === e.source || n.id === e.target),
      ),
    );
  }

  return {
    templateName,
    activeTab,
    tabs: [...tabs],
    nodes,
    edges,
    connections,
    idGen,
    startEditor,
    addTab,
    removeTab,
    renameTab,
    updateTab,
    addNode,
    addEdge,
    addNodes,
    getGroupNodes,
    setActiveTab,
    changeNodesByTab,
    changeEdgesByTab,
    setNodeExpanded,
    undo,
    redo,
    onAutoLayout,
    getNodesByTab: (tab: string) => nodesByTab.get(tab) ?? [],
    getEdgesByTab: (tab: string) => edgesByTab.get(tab) ?? [],
    getActiveNodesAndEdges: () => ({
      nodes: nodesByTab.get(activeTab) ?? [],
      edges: edgesByTab.get(activeTab) ?? [],
    }),
  };
}

export function useFlow() {
  const ctx = useContext(FlowContext);
  if (!ctx) {
    throw new Error("useFlow must be used inside <FlowProvider>");
  }
  return ctx;
}
