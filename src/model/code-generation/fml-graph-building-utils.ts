import type { Edge, Node } from "@xyflow/react";
import { FMLBaseEntity, FMLGroupNode, FMLRule } from "./fml-entities";
import {
  findNode,
  getType,
  isGroupNode,
  isNode,
  isRule,
  isTransformParam,
  toFMLNodeType,
  transformParamFromNode,
  valueParam,
} from "./fml-utils";
import _ from "lodash";

export function buildRuleFromEdge(nodes: Node[], edge: Edge): FMLRule {
  const targetNode = findNode(nodes, edge.target);
  const leftParam = transformParamFromNode(targetNode, edge.targetHandle!);
  const sourceNode = findNode(nodes, edge.source);

  //const
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

  //create
  if (edge.id === edge.source) {
    const createParam = transformParamFromNode(sourceNode);
    return new FMLRule(
      `create_${createParam.id}`,
      toFMLNodeType(targetNode.type!),
      "create",
      createParam,
      leftParam,
    );
  }

  const isReference =
    !edge.sourceHandle &&
    sourceNode.type! === "targetNode" &&
    targetNode.type! === "targetNode";

  //copy - group
  const rightParam = transformParamFromNode(
    sourceNode,
    edge.sourceHandle ?? undefined,
  );
  const type = getType(
    toFMLNodeType(sourceNode.type!),
    toFMLNodeType(targetNode.type!),
  );
  return new FMLRule(
    type === "groupNode"
      ? `group_${rightParam.id}`
      : `copy_${leftParam.field ?? leftParam.resource}_${leftParam.id}`,
    type,
    type === "groupNode" ? undefined : "copy",
    rightParam,
    leftParam,
    isReference,
  );
}

export function attachParentChild(parent: FMLBaseEntity, child: FMLBaseEntity) {
  if (
    parent.type === child.type ||
    ["sourceTargetNode", "groupNode"].includes(child.type)
  ) {
    parent.addChild(child);
    child.father = parent;
  }
}

interface Dependency {
  alias: string;
  field?: string;
  father?: Dependency;
  children: Dependency[];
}

export function createTreeVariables(
  node: FMLBaseEntity,
  new_nodes: Dependency[] = [],
) {
  if (isNode(node) && !isGroupNode(node)) {
    const new_node = { alias: node.alias, children: [] } as Dependency;
    if (node.father) {
      const prev_node = _.first(
        new_nodes.map((n) =>
          n.children.find(
            (c: Dependency) => c.field === new_node.alias.split("_")[0],
          ),
        ),
      );
      new_node.father = prev_node;
      prev_node?.children.push(new_node);
    } else if (!new_nodes.find((n) => n.alias === new_node.alias)) {
      new_nodes.push(new_node);
    }
    const children = new Set(node.children);
    Array.from(children.values()).forEach((c) => {
      if (isRule(c) && isTransformParam(c.rightParam)) {
        const alias = c.rightParam.alias;
        const field = c.rightParam.field;
        if (new_node.alias != alias || field)
          new_node.children.push({
            alias,
            field,
            father: new_node,
            children: [],
          } as Dependency);
      }
    });
  }
  node.children.forEach((c) => createTreeVariables(c, new_nodes));
  return new_nodes;
}

export function collectDependencies(
  node: FMLBaseEntity,
  findNode: (id: string) => FMLBaseEntity,
  dependencies: Map<string, FMLBaseEntity[]> = new Map(),
): Map<string, FMLBaseEntity[]> {
  if (isRule(node) && node.isReference) {
    if (!dependencies.has(node.id)) {
      dependencies.set(node.id, []);
    }
    dependencies.get(node.id)!.push(...getPath(findNode(node.leftParam.id)));
  }

  for (const child of node.children) {
    collectDependencies(child, findNode, dependencies);
  }

  return dependencies;
}

export function getPath(node: FMLBaseEntity, path: FMLBaseEntity[] = []) {
  if (node.father) return getPath(node.father, [node, ...path]);
  else return [node, ...path];
}

function searchDependency(
  toSearch: string,
  dependencies: Dependency[],
): string[] {
  const getChainOfFathers = (dependency: Dependency): string[] => {
    return [
      dependency.alias + (dependency.field ? "." + dependency.field : ""),
      ...(dependency.father ? getChainOfFathers(dependency.father) : []),
    ];
  };

  return dependencies.flatMap((d) => {
    const sourceAndField = d.alias + (d.field ? "." + d.field : "");
    if (toSearch === sourceAndField) {
      return getChainOfFathers(d);
    } else return searchDependency(toSearch, d.children);
  });
}

const INDENT = "  ";

const isSourceOrTargetRule = (node: FMLBaseEntity): boolean =>
  isRule(node) && !isGroupNode(node);

const isGroupFMLNode = (node: FMLBaseEntity): node is FMLGroupNode =>
  !isRule(node) && isGroupNode(node);

const getIndent = (level: number) => INDENT.repeat(level);

function buildChainToString(
  node: FMLBaseEntity,
  sourceTree: Dependency[],
): string {
  if (!isRule(node)) return "";
  if (!isTransformParam(node.rightParam)) return "";

  const { alias, field } = node.rightParam;
  const toSearch = field ? `${alias}.${field}` : alias;

  const deps = searchDependency(toSearch, sourceTree)
    .reverse()
    .slice(1)
    .filter(d => d.includes("."));

  if (deps.length === 0) return "";

  const sourceChain = deps.map((d, i) => {
    if (i === deps.length - 1) {
      const [, name] = d.split(".");
      return `${d} as ${name}`;
    }
    return `${d} as ${deps[i + 1].split(".")[0]}`;
  });

  return sourceChain.length > 1
    ? sourceChain.join(", ") + ", "
    : sourceChain[0] + ", ";
}

export function printRuleTree(
  node: FMLBaseEntity,
  dependencies: Map<string, FMLBaseEntity[]>,
  sourceTree: Dependency[],
  lines: string[] = [],
  level = 1,
  visited = new Set<string>(),
): string[] {
  if (visited.has(node.id)) return lines;

  for (const dep of dependencies.get(node.id) ?? []) {
    printRuleTree(dep, dependencies, sourceTree, lines, level, visited);
  }

  const hasChildren = node.children.length > 0;
  const shouldPrint = isSourceOrTargetRule(node) || isGroupFMLNode(node);
  const indent = isGroupFMLNode(node) ? "" : getIndent(level);

  if (isGroupFMLNode(node)) {
    node.setLevel(level - 1);
  }

  if (shouldPrint) {
    const chainToString = buildChainToString(node, sourceTree);
    const line = `${indent}${chainToString}${node.toString()}`;

    lines.push(hasChildren ? `${line} then {` : line);
  }

  visited.add(node.id);

  const nextLevel = shouldPrint ? level + 1 : level;
  for (const child of node.children) {
    printRuleTree(
      child,
      dependencies,
      sourceTree,
      lines,
      nextLevel,
      visited,
    );
  }

  if (isSourceOrTargetRule(node) && hasChildren) {
    lines.push(`${getIndent(level)}} "${node.id}";`);
  }

  return lines;
}

