import type { Edge, Node } from "@xyflow/react";
import { FMLBaseEntity, FMLRule } from "./fml-entities";
import {
  findNode,
  getType,
  isNode,
  isRule,
  isTransformParam,
  toFMLNodeType,
  transformParamFromNode,
  valueParam,
} from "./fml-utils";

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

  //copy
  const rightParam = transformParamFromNode(
    sourceNode,
    edge.sourceHandle ?? undefined,
  );
  return new FMLRule(
    `copy_${leftParam.field}_${leftParam.id}`,
    getType(toFMLNodeType(sourceNode.type!), toFMLNodeType(targetNode.type!)),
    "copy",
    rightParam,
    leftParam,
    isReference,
  );
}

export function attachParentChild(parent: FMLBaseEntity, child: FMLBaseEntity) {
  if (parent.type === child.type || child.type === "both") {
    parent.addChild(child);
    child.father = parent;
  }
}

export function printVariablesTree(
  node: FMLBaseEntity,
  printRuleTree: (level: number, lines: string[]) => string[],
  level: number = 0,
  lines: string[] = [],
) {
  if (isNode(node)) {
    const childrenToPrint = new Set(
      node.children.map((c) => {
        if (isRule(c) && isTransformParam(c.rightParam)) {
          const alias = c.rightParam.alias;
          const field = c.rightParam.field;
          if (node.alias === alias) {
            const fieldPart = field ? `.${field} as ${field}` : "";
            return `${alias}${fieldPart} then {`;
          } else {
            return "";
          }
        }
      }),
    );
    childrenToPrint.forEach((c) => {
      const childIndent = "  ".repeat(level++);
      lines.push(`${childIndent}${c}`);
    });
    node.children.forEach((c) => {
      printVariablesTree(c, printRuleTree, level, lines);
    });
    lines = printRuleTree(level, lines);
    for (let i = 0; i < childrenToPrint.size; i++) {
      lines.push(`${"  ".repeat(--level)}} "level ${level}";`);
    }
  } else {
    node.children.forEach((child) =>
      printVariablesTree(child, printRuleTree, level, lines),
    );
  }

  return lines.join("\n");
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

export function printRuleTree(
  node: FMLBaseEntity,
  dependencies: Map<string, FMLBaseEntity[]>,
  level: number = 0,
  lines: string[] = [],
  visited: Set<string> = new Set(),
): string[] {
  if (visited.has(node.id)) return lines;
  const indent = "  ".repeat(level);
  const hasChildren = node.children.length > 0;

  const dep = dependencies.get(node.id);
  dep?.forEach((n) => {
    printRuleTree(n, dependencies, level, lines, visited);
  });

  if (!visited.has(node.id)) {
    if (isRule(node)) {
      if (!hasChildren) lines.push(indent + node.toString());
      else lines.push(indent + node.toString() + " then {");
    }
    visited.add(node.id);
  }

  for (const child of node.children) {
    printRuleTree(child, dependencies, level + 1, lines, visited);
  }

  if (isRule(node) && hasChildren) {
    lines.push(indent + `} "${node.id}";`);
  }

  return lines;
}

// export function printRuleTree(
//   node: FMLBaseEntity,
//   level: number = 0,
//   lines: string[] = [],
// ): string[] {
//   const indent = "  ".repeat(level);
//   const hasChildren = node.children.length > 0;

//   if (isRule(node)) {
//     if (!hasChildren) lines.push(indent + node.toString());
//     else lines.push(indent + node.toString() + " then {");
//   }

//   node.children.forEach((child) => printRuleTree(child, level + 1, lines));

//   if (isRule(node) && hasChildren) {
//     lines.push(indent + `} "${node.id}";`);
//   }

//   return lines;
// }