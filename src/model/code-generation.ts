import type { Edge, Node } from "@xyflow/react";
import type { Field } from "src-common/fhir-types";
import type { TransformName } from "src/components/nodes/TransformNode";

export type TransformParameter = {
  type: "transform";
  id: string;
  resource: string;
  alias: string;
  field?: string;
};

export type ValueParameter = {
  type: "value";
  value: string;
};

export type Parameter = TransformParameter | ValueParameter;

export function transformParamFromNode(
  node: Node,
  field?: string,
): TransformParameter {
  return {
    type: "transform",
    id: node.id,
    resource: node.data.type.name,
    alias: node.data.alias,
    field,
  };
}

export function valueParam(value: string): ValueParameter {
  return { type: "value", value };
}

export function findNode(nodes: Node[], id: string): Node {
  const node = nodes.find((n) => n.id === id);
  if (!node) throw new Error(`Node with id '${id}' not found`);
  return node;
}

class FMLBaseEntity {
  id: string;
  type: string;
  father?: FMLBaseEntity;
  children: FMLBaseEntity[] = [];

  constructor(id: string, type: string) {
    this.id = id;
    this.type = type;
  }

  addChild(child: FMLBaseEntity) {
    this.children.push(child);
  }
}

export class FMLNode extends FMLBaseEntity {
  resource: string;
  alias: string;
  fields: Field[];

  constructor(node: Node) {
    super(node.id, node.type!);
    this.resource = node.data.type.name;
    this.alias = node.data.alias;
    this.fields = Object.keys(node.data.type.fields ?? {});
  }

  toString(): string {
    return `[Node] ${this.resource} ${this.alias}`;
  }
}

export class FMLRule extends FMLBaseEntity {
  constructor(
    id: string,
    type: string,
    public readonly action: TransformName,
    public readonly rightParam: Parameter,
    public readonly leftParam: TransformParameter,
    public readonly parameters?: any[],
    public readonly condition?: string,
  ) {
    super(id, type);
  }

  private formatSource(): string {
    if (this.rightParam.type === "value") return `"${this.rightParam.value}"`;
    return `${this.rightParam.alias}${this.rightParam.field ? `.${this.rightParam.field}` : ""}`;
  }

  private formatTarget(): string {
    return `${this.leftParam.alias}${this.leftParam.field ? `.${this.leftParam.field}` : ""}`;
  }

  toString(): string {
    const target = this.formatTarget();
    switch (this.action) {
      case "copy":
        return `${target} = ${this.formatSource()}`;
      case "create":
        return `${target} = create("${(this.rightParam as TransformParameter).resource}") as ${(this.rightParam as TransformParameter).alias}`;
    }
  }
}

export type FMLEdge = {
  id: string;
  from: FMLBaseEntity;
  to: FMLBaseEntity;
};

export class FMLGraph {
  nodes = new Map<string, FMLNode>();
  rules = new Map<string, FMLRule>();
  edges: FMLEdge[] = [];

  addNode(node: FMLNode) {
    this.nodes.set(node.id, node);
  }

  addRule(rule: FMLRule) {
    this.rules.set(rule.id, rule);
  }

  addEdge(from: FMLBaseEntity, to: FMLBaseEntity) {
    this.edges.push({
      id: `${from.id}->${to.id}`,
      from,
      to,
    });
  }

  getRoots(): FMLBaseEntity[] {
    const all = [...this.nodes.values(), ...this.rules.values()];
    return all.filter((n) => !n.father);
  }
}

function buildRuleFromEdge(nodes: Node[], edge: Edge): FMLRule {
  const targetNode = findNode(nodes, edge.target);
  const leftParam = transformParamFromNode(targetNode, edge.targetHandle!);

  if (edge.sourceHandle) {
    const sourceNode = findNode(nodes, edge.source);
    const rightParam = transformParamFromNode(sourceNode, edge.sourceHandle);
    return new FMLRule(
      `${rightParam.id}-${leftParam.id}`,
      sourceNode.type!,
      "copy",
      rightParam,
      leftParam,
    );
  }

  const sourceNode = findNode(nodes, edge.id);
  if (sourceNode.type === "transformNode") {
    const value = sourceNode.data.args[0].value;
    return new FMLRule(
      `rule_${leftParam.id}`,
      "targetNode",
      "copy",
      valueParam(value),
      leftParam,
    );
  }

  const createParam = transformParamFromNode(sourceNode);
  return new FMLRule(
    `${createParam.id}-${leftParam.id}`,
    sourceNode.type!,
    "create",
    createParam,
    leftParam,
  );
}

function printTree(root: FMLBaseEntity) {
  console.log(root.toString());
  if (root.children) {
    root.children.forEach(printTree);
  }
}

function attachParentChild(
  graph: FMLGraph,
  parent: FMLBaseEntity,
  child: FMLBaseEntity,
) {
  parent.addChild(child);
  child.father = parent;
  graph.addEdge(parent, child);
}

export function createGraph(nodes: Node[], edges: Edge[]) {
  const graph = new FMLGraph();
  const nodeMap = new Map<string, FMLNode>();

  const getOrCreateNode = (node: Node): FMLNode => {
    if (!nodeMap.has(node.id)) {
      const fmlNode = new FMLNode(node);
      nodeMap.set(node.id, fmlNode);
      graph.addNode(fmlNode);
    }
    return nodeMap.get(node.id)!;
  };

  edges.forEach((edge) => {
    const rule = buildRuleFromEdge(nodes, edge);
    graph.addRule(rule);

    const targetNode = getOrCreateNode(findNode(nodes, rule.leftParam.id));

    if (rule.rightParam.type === "transform") {
      const sourceNode = getOrCreateNode(findNode(nodes, rule.rightParam.id));

      const father = rule.type === "sourceNode" ? sourceNode : targetNode;
      const child = rule.type === "sourceNode" ? targetNode : sourceNode;

      attachParentChild(graph, father, rule);
      attachParentChild(graph, rule, child);
    } else {
      attachParentChild(graph, targetNode, rule);
    }
  });
  const roots = graph.getRoots();
  console.log(roots);
  roots.forEach((r) => {
    console.log("PRINTO ALBERO");
    printTree(r);
  });
}