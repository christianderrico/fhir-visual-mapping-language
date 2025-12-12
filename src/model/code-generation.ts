import type { Edge, Node } from "@xyflow/react";
import type { Field } from "src-common/fhir-types";
import type { URL } from "src-common/strict-types";
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

type NodeType = "sourceNode" | "targetNode" | "both";

function toFMLNodeType(type: string): NodeType {
  switch (type) {
    case "sourceNode":
      return "sourceNode";
    case "targetNode":
      return "targetNode";
    default:
      return "both";
  }
}

function getType(sourceType: NodeType, targetType: NodeType): NodeType {
  if (sourceType === targetType) return sourceType;
  return "both";
}

function fieldExtractType(field: Field) {
  switch (field.kind) {
    case "backbone-element":
      return "BackboneElement";
    case "complex":
      return field.value;
    default:
      return field.name;
  }
}

export function transformParamFromNode(
  node: Node,
  field?: string,
): TransformParameter {
  return {
    type: "transform",
    id: node.id,
    resource: fieldExtractType(node.data.type as Field),
    alias: node.data.alias,
    field,
  };
}

function isRule(node: FMLBaseEntity): node is FMLRule {
  return "action" in node;
}

function isNode(node: FMLBaseEntity): node is FMLNode {
  return "url" in node;
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
  type: NodeType;
  father?: FMLBaseEntity;
  children: FMLBaseEntity[] = [];

  constructor(id: string, type: NodeType) {
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
  url: URL;

  constructor(node: Node) {
    super(node.id, toFMLNodeType(node.type!));
    this.resource = node.data.type.name;
    this.alias = node.data.alias;
    this.url = node.data.type.url;
  }

  toString(): string {
    return `${this.alias}`;
  }
}

export class FMLRule extends FMLBaseEntity {
  constructor(
    id: string,
    type: NodeType,
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
    return `${this.rightParam.field ? `${this.rightParam.field}` : ""}`;
  }

  private formatTarget(): string {
    return `${this.leftParam.alias}${this.leftParam.field ? `.${this.leftParam.field}` : ""}`;
  }

  toString(): string {
    const target = this.formatTarget();
    switch (this.action) {
      case "copy":
        return `${this.leftParam.alias} -> ${target} = ${this.formatSource()} "${this.id}";`;
      case "create":
        return `${this.leftParam.alias} -> ${target} = create("${(this.rightParam as TransformParameter).resource}") as ${(this.rightParam as TransformParameter).alias}`;
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

  filterRoot(
    predicate: (n: FMLBaseEntity) => boolean,
  ): FMLBaseEntity | undefined {
    return this.getRoots().find(predicate);
  }

  getSourceRoot(): FMLBaseEntity | undefined {
    return this.filterRoot((n) => n.type === "sourceNode");
  }

  getTargetRoot(): FMLBaseEntity | undefined {
    return this.filterRoot((n) => n.type === "targetNode");
  }
}

function buildRuleFromEdge(nodes: Node[], edge: Edge): FMLRule {
  const targetNode = findNode(nodes, edge.target);
  const leftParam = transformParamFromNode(targetNode, edge.targetHandle!);

  if (edge.sourceHandle) {
    const sourceNode = findNode(nodes, edge.source);
    const rightParam = transformParamFromNode(sourceNode, edge.sourceHandle);
    return new FMLRule(
      `copy_${leftParam.field}`,
      getType(toFMLNodeType(sourceNode.type!), toFMLNodeType(targetNode.type!)),
      "copy",
      rightParam,
      leftParam,
    );
  }

  const sourceNode = findNode(nodes, edge.id);
  if (sourceNode.type === "transformNode") {
    const value = sourceNode.data.args[0].value;
    return new FMLRule(
      `copy_${leftParam.id}`,
      "targetNode",
      "copy",
      valueParam(value),
      leftParam,
    );
  }

  const createParam = transformParamFromNode(sourceNode);
  return new FMLRule(
    `create_${createParam.id}`,
    toFMLNodeType(targetNode.type!),
    "create",
    createParam,
    leftParam,
  );
}

function debugTree(node: FMLBaseEntity) {
  console.log(node.id);
  node.children.forEach(debugTree);
}

function isTransformParam(p: Parameter): p is TransformParameter {
  return p.type === "transform";
}

function printVariablesTree(
  node: FMLBaseEntity,
  printRuleTree: (level: number, lines: string[]) => string[],
  level: number = 0,
  lines: string[] = [],
) {
  if (isNode(node)) {
    node.children.forEach((c) => {
      if (isRule(c) && isTransformParam(c.rightParam)) {
        const childIndent = "  ".repeat(level++);
        const alias = c.rightParam.alias;
        const field = c.rightParam.field;
        if (node.alias === alias) {
          const fieldPart = field ? `.${field} as ${field}` : "";
          lines.push(`${childIndent}${node.alias}${fieldPart} then {`);
          printVariablesTree(c, printRuleTree, level, lines);
        }
      }
    });
    lines = printRuleTree(level, lines);
    for (let i = 0; i < node.children.length; i++) {
      lines.push(`${"  ".repeat(--level)}};`);
    }
  } else {
    node.children.forEach((child) =>
      printVariablesTree(child, printRuleTree, level, lines),
    );
  }

  return lines.join("\n");
}

function printRuleTree(
  node: FMLBaseEntity,
  level: number = 0,
  lines: string[] = [],
): string[] {
  const indent = "  ".repeat(level);
  const hasChildren = node.children.length > 0;

  if (isRule(node)) {
    if (!hasChildren) lines.push(indent + node.toString());
    else lines.push(indent + node.toString() + " then {");
  }

  node.children.forEach((child) => printRuleTree(child, level + 1, lines));

  if (isRule(node) && hasChildren) {
    lines.push(indent + `} "${node.id}";`);
  }

  return lines;
}

function attachParentChild(
  graph: FMLGraph,
  parent: FMLBaseEntity,
  child: FMLBaseEntity,
) {
  if (parent.type === child.type || child.type === "both") {
    parent.addChild(child);
    child.father = parent;
    graph.addEdge(parent, child);
  }
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

      if (rule.type === "sourceNode") {
        attachParentChild(graph, sourceNode, rule);
        attachParentChild(graph, rule, targetNode);
      } else if (rule.type === "targetNode") {
        attachParentChild(graph, targetNode, rule);
        attachParentChild(graph, rule, sourceNode);
      } else if (rule.type === "both") {
        attachParentChild(graph, sourceNode, rule);
        attachParentChild(graph, targetNode, rule);
      }
    } else {
      attachParentChild(graph, targetNode, rule);
    }
  });
  const source = graph.getSourceRoot() as FMLNode;
  const target = graph.getTargetRoot() as FMLNode;

  const lines = [
    `map "http://hl7.org/fhir/StructureMap/prova" = "prova"`,
    "",
    `uses "${source.url}" alias ${source.resource} as source`,
    `uses "${target.url}" alias ${target.resource} as source`,
    "",
  ];
  lines.push(
    `group main(source ${source.alias} : ${source.resource}, target ${target.alias} : ${target.resource}) {`,
  );
  const result =
    printVariablesTree(
      source,
      (level, lines) => printRuleTree(target, level, lines),
      1,
      lines,
    ) + "\n}";
  return result;
}
