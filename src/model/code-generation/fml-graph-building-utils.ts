import type { Edge, Node } from "@xyflow/react";
import { FMLBaseEntity, FMLGroupNode, FMLRule } from "./fml-entities";
import {
  findNode,
  isFakeNode,
  isGroupNode,
  isNode,
  isRule,
  isTransformNode,
  isTransformParam,
  toFMLNodeType,
  transformParamFromNode,
  valueParam,
} from "./fml-utils";
import _ from "lodash";
import type {
  Argument,
  TransformName,
} from "src/components/nodes/TransformNode";
import type {
  NodeType,
  Parameter,
  TransformParameter,
  ValueParameter,
} from "./fml-types";
import { isResource } from "src-common/fhir-types";
import { v4 as uuid } from "uuid";

export function buildRules(
  nodes: Node[],
  edges: Edge[],
): (FMLRule | FMLGroupNode | null | undefined)[] {
  const groups = new Map<string, FMLGroupNode>();
  return edges.map((edge) => {
    const { source, target, sourceHandle, targetHandle, data } = edge;

    const condition = data?.condition as string;

    const targetNode = findNode(nodes, target);
    const sourceNode = findNode(nodes, source);

    const leftParam = transformParamFromNode(targetNode, targetHandle!);

    if (sourceNode.type === "transformNode") {
      return handleTransformNode(
        sourceNode,
        targetNode,
        leftParam,
        nodes,
        edges,
      )?.setCondition(condition);
    }

    if (sourceNode.type === "sourceNode" && targetNode.type === "sourceNode") {
      const leftParam = transformParamFromNode(
        targetNode,
        targetHandle ?? undefined,
      );
      const rightParam = transformParamFromNode(
        sourceNode,
        sourceHandle ?? undefined,
      );
      return handleSourceToSource(leftParam, rightParam);
    }

    if (sourceNode.type === "targetNode" && targetNode.type === "targetNode") {
      return handleCreateOperation(
        sourceNode,
        targetNode,
        leftParam,
      ).setCondition(condition);
    }

    if (sourceNode.type === "sourceNode" && targetNode.type === "targetNode") {
      const resType = targetNode.data.type;
      const isReferenceRule =
        isResource(resType) && resType.kind != "primitive-type" && targetHandle
          ? resType.fields[targetHandle].kind === "reference"
          : false;

      return handleCopyOperation(
        sourceNode,
        targetNode,
        leftParam,
        isReferenceRule,
        sourceHandle!,
      ).setCondition(condition);
    }

    if (sourceNode.type === "groupNode" && targetNode.type === "targetNode") {
      return handleTargetGroup(
        sourceNode,
        {
          targetNode: targetNode,
          field: edge.targetHandle ?? undefined,
        },
        groups,
      );
    } else if (
      sourceNode.type === "sourceNode" &&
      targetNode.type === "groupNode"
    ) {
      return handleSourceGroup(
        {
          sourceNode: sourceNode,
          field: edge.sourceHandle ?? undefined,
        },
        targetNode,
        groups,
      );
    }

    return null;
  });
}

function handleTransformNode(
  sourceNode: Node,
  targetNode: Node,
  leftParam: TransformParameter,
  nodes: Node[],
  edges: Edge[],
): FMLRule | null {
  const transformName = sourceNode.data.transformName;

  if (transformName === "const") {
    return handleConstTransform(sourceNode, targetNode, leftParam);
  }

  if (transformName === "uuid") {
    const minEdgeSorted = edges
      .filter((e) => e.source === sourceNode.id)
      .sort((a, b) => Number(a.target) - Number(b.target))[0];

    const isReference =
      edges.filter(
        (e) => e.source === sourceNode.id || e.target === sourceNode.id,
      ).length >= 2;

    return handleUiidTransform(
      leftParam,
      {
        id: sourceNode.id,
        alias:
          minEdgeSorted.target === leftParam.id
            ? `uuid() as uuid_${leftParam.id}`
            : `uuid_${minEdgeSorted.target}`,
      } as TransformParameter,
      isReference,
    );
  }

  if (
    transformName === "append" ||
    transformName === "evaluate" ||
    transformName === "translate"
  ) {
    return handleTransformFunction(sourceNode, leftParam, nodes, edges);
  }

  return null;
}

function handleConstTransform(
  sourceNode: Node,
  targetNode: Node,
  leftParam: TransformParameter,
): FMLRule | null {
  const isValidTarget =
    targetNode.type === "targetNode" || targetNode.type === "sourceNode";
  if (!isValidTarget) return null;

  const value = extractValueFromNode(sourceNode);
  return new FMLRule(`const_${uuid()}`, "targetNode", "copy", leftParam, [
    valueParam(targetNode.id, value),
  ]);
}

function handleUiidTransform(
  leftParam: TransformParameter,
  rightParam: TransformParameter,
  isReference: boolean,
): FMLRule | null {
  const r = new FMLRule(
    `uiid_${leftParam.alias}`,
    "targetNode",
    "uuid",
    leftParam,
    [rightParam],
    isReference,
  );

  return r;
}

function handleTransformFunction(
  sourceNode: Node,
  leftParam: TransformParameter,
  nodes: Node[],
  edges: Edge[],
): FMLRule {
  const action = sourceNode.data.transformName;

  const params = getConnectedParamsForTransform(sourceNode.id, nodes, edges);
  const isSourceTarget =
    params.filter(isTransformParam).filter((p) => p.originType === "sourceNode")
      .length > 0;

  return new FMLRule(
    `${action}_${leftParam.id}_${sourceNode.id}`,
    isSourceTarget ? "sourceTargetNode" : "targetNode",
    action as TransformName,
    leftParam,
    params,
  );
}

function handleCreateOperation(
  sourceNode: Node,
  targetNode: Node,
  leftParam: TransformParameter,
): FMLRule {
  const createParam = transformParamFromNode(sourceNode);
  return new FMLRule(
    `create_${createParam.id}`,
    toFMLNodeType(targetNode.type!),
    "create",
    leftParam,
    [createParam],
  );
}

function handleSourceToSource(
  sourceParam: TransformParameter,
  targetParam: TransformParameter,
) {
  return new FMLRule(
    `navigation_${sourceParam.id}-${targetParam.id}`,
    "sourceNode",
    "create",
    sourceParam,
    [targetParam],
  );
}

function handleCopyOperation(
  sourceNode: Node,
  targetNode: Node,
  leftParam: TransformParameter,
  isReferenceRule: boolean,
  sourceHandle?: string,
): FMLRule {
  const isReference =
    !sourceHandle &&
    sourceNode.type! === "targetNode" &&
    targetNode.type! === "targetNode";

  const rightParam = transformParamFromNode(
    sourceNode,
    sourceHandle ?? undefined,
  );
  const type: NodeType = "sourceTargetNode";
  const operation = isReferenceRule ? "reference" : "copy";
  const ruleId = `${operation}_${leftParam.field ?? leftParam.resource}_${leftParam.id}`;

  return new FMLRule(
    ruleId,
    type,
    operation,
    leftParam,
    [rightParam],
    isReference,
  );
}

function handleTargetGroup(
  sourceNode: Node,
  target: { targetNode: Node; field: string | undefined },
  groups: Map<string, FMLGroupNode>,
) {
  let group = groups.get(sourceNode.id);
  if (group === undefined) {
    group = new FMLGroupNode(sourceNode);
    groups.set(sourceNode.id, group);
  }
  group.addTarget(transformParamFromNode(target.targetNode, target.field));
  if (
    group.sources.length === (sourceNode.data.sources as string[]).length &&
    group.targets.length === (sourceNode.data.targets as string[]).length
  ) {
    return group;
  }
}

function handleSourceGroup(
  source: { sourceNode: Node; field: string | undefined },
  targetNode: Node,
  groups: Map<string, FMLGroupNode>,
) {
  let group = groups.get(targetNode.id);
  if (group === undefined) {
    group = new FMLGroupNode(targetNode);
    groups.set(targetNode.id, group);
  }
  group.addSource(transformParamFromNode(source.sourceNode, source.field));
  if (
    group.sources.length === (targetNode.data.sources as string[]).length &&
    group.targets.length === (targetNode.data.targets as string[]).length
  ) {
    return group;
  }
}

function extractValueFromNode(node: Node): string | number {
  const arg = (node.data.args as Argument[])[0];
  return arg.value;
}

function getConnectedParamsForTransform(
  transformNodeId: string,
  nodes: Node[],
  edges: Edge[],
): Parameter[] {
  const connectedEdges = edges.filter((e) => e.target === transformNodeId);

  return connectedEdges.map((e) => {
    const node = findNode(nodes, e.source);
    const field =
      node.data.transformName === "uuid"
        ? (node.data.args as ValueParameter[])[0].value.toString()
        : e.sourceHandle;

    return field
      ? transformParamFromNode(node, field as string)
      : valueParam(node.id, extractValueFromNode(node));
  });
}

export function attachParentChild(parent: FMLBaseEntity, child: FMLBaseEntity) {
  if (
    parent.type === child.type ||
    ["sourceTargetNode", "groupNode"].includes(child.type)
  ) {
    if (!parent.children.includes(child)) parent.addChild(child);
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
  parent?: Dependency,
): Dependency[] {
  if (
    isNode(node) &&
    !isTransformNode(node) &&
    !isGroupNode(node) &&
    !isFakeNode(node)
  ) {
    let current_node: Dependency;
    if (!parent) {
      current_node = { alias: node.alias, children: [] } as Dependency;
      new_nodes.push(current_node);
    } else {
      current_node = {
        alias: node.alias,
        children: [],
        father: parent,
      } as Dependency;
      parent.children.push(current_node);
    }
    node.children.forEach((c) =>
      createTreeVariables(c, new_nodes, current_node),
    );
  } else if (isRule(node)) {
    let current_node: Dependency;
    parent!.children.push(...node.rightParams.filter(isTransformParam).map((param) => {
      current_node = {
        alias: param.alias,
        field: param.field,
        children: [],
        father: parent,
      };
      return current_node;
    }));
    node.children.forEach((c) => createTreeVariables(c, new_nodes, current_node));
  } else {
    node.children.forEach((c) => createTreeVariables(c, new_nodes, parent));
  }

  return new_nodes;
}

export function collectDependencies(
  node: FMLBaseEntity,
  nodes: Node[],
  edges: Edge[],
  nodeMap: Map<string, FMLBaseEntity>,
  dependencies: Map<string, FMLBaseEntity[]> = new Map(),
): Map<string, FMLBaseEntity[]> {
  if (isRule(node) && node.isReference) {
    if (!dependencies.has(node.id)) {
      dependencies.set(node.id, []);
    }
    const dependenciesArrows = edges
      .filter((e) => node.rightParams.some((r) => r.id === e.source))
      .filter((e) => e.target != node.father?.id);

    dependenciesArrows
      .flatMap((dep) => {
        return [...nodeMap.values()]
          .filter((n) => n.children.length > 0 && !isFakeNode(n))
          .flatMap((n) => n.children)
          .filter(isRule)
          .filter(
            (rule) =>
              rule.rightParams.find((param) => param.id === dep.source) &&
              node.id != rule.id,
          );
      })
      .filter(
        (rule, index, self) =>
          index === self.findIndex((r) => r.id === rule.id),
      )
      .forEach((r) => dependencies.get(node.id)!.push(...getPath(r!)));
  }

  for (const child of node.children) {
    collectDependencies(child, nodes, edges, nodeMap, dependencies);
  }

  return dependencies;
}

export function getPath(node: FMLBaseEntity, path: FMLBaseEntity[] = []) {
  if (node.father && node.father.type != "fakeNode")
    return getPath(node.father, [node, ...path]);
  else return [...path, node];
}

const isSourceOrTargetRule = (node: FMLBaseEntity): boolean =>
  isRule(node) && !isGroupNode(node);

const isCreate = (node: FMLBaseEntity): boolean =>
  isRule(node) && node.action === "create";

const isGroupFMLNode = (node: FMLBaseEntity): node is FMLGroupNode =>
  !isRule(node) && isGroupNode(node);

const flatList = (dependency: Dependency): Dependency[] => {
  return dependency.children.length > 0
    ? [dependency, ...dependency.children.flatMap(flatList)]
    : [dependency];
};

const getChain = (name: Partial<Dependency>, tree: Dependency[]) => {
  const getFather = (dep: Dependency): Partial<Dependency>[] =>
    dep.father
      ? [...getFather(dep.father), { alias: dep.alias, field: dep.field }]
      : [{ alias: dep.alias, field: dep.field }];

  const node = tree
    .flatMap(flatList)
    .find((d) => d.alias === name.alias && d.field === name.field);

  const chain = node ? getFather(node) : [];
  const mappedChain = chain.map((c, i) =>
    i === chain.length - 1
      ? { ...c, add_alias: c.alias!.split("_")[1] }
      : { ...c, add_alias: chain[i + 1].alias! },
  );

  const filteredChain = mappedChain.filter((v) => v.field != undefined)

  return filteredChain;
};

const getDependencies = (
  params: TransformParameter[],
  dependencies: Dependency[],
): Partial<Dependency> & { add_alias: string }[] => {
  return params.flatMap((param) =>
    _.uniqBy(
      getChain({ alias: param.alias, field: param.field }, dependencies),
      (s) => `${s.alias}-${s.field}`,
    ),
  );
};

const indent = (level: number) => "  ".repeat(level > 0 ? level : 0);

const step = (s: Partial<Dependency> & { add_alias: string }) =>
  `${s.alias}${s.field ? `.${s.field} as ${s.add_alias.includes("_") ? s.add_alias : s.field + "_" + s.add_alias} ` : " "}`;

const open = (
  chain: Partial<Dependency> & { add_alias: string }[],
  offset = 0,
  isGroup = false,
  condition = "",
) =>
  chain
    .map(
      (s, i) =>
        indent(i + offset) +
        step(s) +
        `${condition && i == chain.length - 1 ? `where ${condition} ` : ""}then ` +
        (isGroup ? (offset === 0 || i != chain.length - 1 ? "{" : "") : "{"),
    )
    .join("\n");

const close = (n: number, from: number) =>
  Array.from({ length: n }, (_, i) => indent(from - i) + `} "";`).join("\n");

const shift = (s: string, level: number) =>
  s
    .split("\n")
    .map((l: string) => indent(level) + l)
    .join("\n");

const buildBlock = (
  sourceChain: Partial<Dependency> & { add_alias: string }[],
  targetChain: Partial<Dependency> & { add_alias: string }[],
  rule: string,
  isGroup: boolean,
  level: number,
  extraIndent = 0,
  condition = "",
) =>
  shift(
    [
      open(sourceChain, 0, isGroup, condition),
      open(targetChain, sourceChain.length, isGroup) +
        (extraIndent ? indent(extraIndent) : "") +
        rule,
      close(
        targetChain.length - 1,
        sourceChain.length + targetChain.length - 2,
      ),
      close(sourceChain.length, sourceChain.length - 1),
    ]
      .filter(Boolean)
      .join("\n"),
    level,
  );

const printBlock =
  (
    variables: { sources: Dependency[]; targets: Dependency[] },
    node: FMLBaseEntity,
    level: number,
  ) =>
  (rule = "") => {
    const { sources, targets } = variables;

    if (isGroupNode(node)) {
      return buildBlock(
        getDependencies(node.sources, sources),
        getDependencies(node.targets, targets),
        rule,
        true,
        level,
      );
    }

    if (isRule(node)) {
      const condition = node.cond;
      const sourceChain = getDependencies(
        node.rightParams.filter(isTransformParam),
        sources,
      );
      const targetChain = getDependencies([node.leftParam], sources);
      const extraIndent = sourceChain.length + targetChain.length;

      return buildBlock(
        sourceChain,
        targetChain,
        rule,
        false,
        level,
        extraIndent,
        condition,
      );
    }
  };

export function printRuleTree(
  node: FMLBaseEntity,
  dependencies: Map<string, FMLBaseEntity[]>,
  variables: { sources: Dependency[]; targets: Dependency[] },
  lines: string[] = [],
  level = 1,
  visited = new Set<string>(),
  isDependant = false,
): string[] {
  if (visited.has(node.id)) return lines;

  const fixCreateBlock = (level: number) => indent(level) + '} "create";';
  const createBlock = printBlock(variables, node, level);

  const shouldPrint = isSourceOrTargetRule(node) || isGroupFMLNode(node);
  const isCreateRule = isCreate(node);

  if (shouldPrint) {
    const toAdd = variables.sources[0].alias + " -> ";
    const block = createBlock(
      (isDependant ? " ".repeat(toAdd.length) : toAdd) + node.toString(),
    );
    lines.push(block!);
  }

  for (const dep of dependencies.get(node.id) ?? []) {
    printRuleTree(dep, dependencies, variables, lines, level, visited, true);
  }

  visited.add(node.id);

  const nextLevel = shouldPrint ? level + 1 : level;
  for (const child of node.children) {
    printRuleTree(child, dependencies, variables, lines, nextLevel, visited);
  }

  if (isCreateRule) {
    lines.push(fixCreateBlock(level));
  }

  return lines;
}
