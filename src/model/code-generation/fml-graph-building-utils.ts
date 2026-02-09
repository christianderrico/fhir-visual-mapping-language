import type { Edge, Node } from "@xyflow/react";
import { FMLBaseEntity, FMLGroupNode, FMLNode, FMLRule } from "./fml-entities";
import {
  findNode,
  isFakeNode,
  isGroupNode,
  isNode,
  isRule,
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
import type { NodeType, Parameter, TransformParameter } from "./fml-types";
import { isResource } from "src-common/fhir-types";
import { v4 as uuid } from "uuid";

export function buildRules(
  nodes: Node[],
  edges: Edge[],
): (FMLRule | FMLGroupNode | null | undefined)[] {
  const groups = new Map<string, FMLGroupNode>();
  return edges.map((edge) => {
    const { source, target, sourceHandle, targetHandle } = edge;

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
      );
    }

    if (sourceNode.type === "targetNode" && targetNode.type === "targetNode") {
      return handleCreateOperation(sourceNode, targetNode, leftParam);
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
      );
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

    return handleUiidTransform(leftParam, {
      alias:
        minEdgeSorted.target === leftParam.id
          ? `uuid() as uuid_${leftParam.id}`
          : `uuid_${minEdgeSorted.target}`,
    } as TransformParameter);
  }

  if (
    transformName === "append" ||
    transformName === "evaluate" ||
    transformName === "translate"
  ) {
    return handleAppendTransform(sourceNode, leftParam, nodes, edges);
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
    valueParam(value),
  ]);
}

function handleUiidTransform(
  leftParam: TransformParameter,
  rightParam: TransformParameter,
): FMLRule | null {
  return new FMLRule(
    `uiid_${leftParam.alias}`,
    "targetNode",
    "uuid",
    leftParam,
    [rightParam],
  );
}

function handleAppendTransform(
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
    `${action}_${leftParam.id}`,
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
    const field = e.sourceHandle;

    return field
      ? transformParamFromNode(node, field)
      : valueParam(extractValueFromNode(node));
  });
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

const createChildNode = (alias: string, father: FMLNode, field?: string) => ({
  alias,
  field,
  father,
  children: [],
});

const processChildNodes = (
  children: Set<FMLBaseEntity>,
  fatherAlias: string,
  new_node: any,
  nodeType: string,
) => {
  const childrenArray = Array.from(children.values());

  childrenArray.forEach((child) => {
    if (isRule(child)) {
      processRuleChild(child, fatherAlias, new_node, nodeType);
    } else if (isGroupNode(child)) {
      processGroupNodeChild(child, fatherAlias, new_node, nodeType);
    }
  });
};

const processRuleChild = (
  child: FMLRule,
  fatherAlias: string,
  new_node: any,
  node_type: string,
) => {
  if (node_type === "sourceNode")
    child.rightParams
      .filter(
        (p: Parameter): p is TransformParameter =>
          isTransformParam(p) && p.alias === fatherAlias,
      )
      .forEach((transformParam: TransformParameter) => {
        new_node.children.push(
          createChildNode(transformParam.alias, new_node, transformParam.field),
        );
      });
  else {
    if (child.leftParam.alias === fatherAlias) {
      new_node.children.push(
        createChildNode(child.leftParam.alias, new_node, child.leftParam.field),
      );
    }
  }
};

const processGroupNodeChild = (
  child: any,
  fatherAlias: string,
  new_node: any,
  nodeType: string,
) => {
  const references = nodeType === "sourceNode" ? child.sources : child.targets;

  references
    .filter((ref: TransformParameter) => ref.alias === fatherAlias)
    .forEach((ref: TransformParameter) => {
      new_node.children.push(createChildNode(ref.alias, new_node, ref.field));
    });
};

export function createTreeVariables(
  node: FMLBaseEntity,
  new_nodes: Dependency[] = [],
) {
  if (isNode(node) && !isGroupNode(node) && !isFakeNode(node)) {
    const new_node = { alias: node.alias, children: [] } as Dependency;

    if (node.father && !isFakeNode(node.father)) {
      const field = new_node.alias.split("_")[0];

      const prev_node = new_nodes
        .flatMap((n) => n.children)
        .find((c: Dependency) => c.field === field);

      new_node.father = prev_node;
      prev_node?.children.push(new_node);
    } else if (!new_nodes.find((n) => n.alias === new_node.alias)) {
      new_nodes.push(new_node);
    }

    const children = new Set(node.children);
    const fatherAlias = node.alias;

    processChildNodes(children, fatherAlias, new_node, node.type);
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

const isSourceOrTargetRule = (node: FMLBaseEntity): boolean =>
  isRule(node) && !isGroupNode(node);

const isCreate = (node: FMLBaseEntity): boolean =>
  isRule(node) && node.action === "create";

const isGroupFMLNode = (node: FMLBaseEntity): node is FMLGroupNode =>
  !isRule(node) && isGroupNode(node);

export function printRuleTree(
  node: FMLBaseEntity,
  dependencies: Map<string, FMLBaseEntity[]>,
  variables: { sources: Dependency[]; targets: Dependency[] },
  lines: string[] = [],
  level = 1,
  visited = new Set<string>(),
): string[] {
  if (visited.has(node.id)) return lines;

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
        : { ...c, add_alias: chain[i + 1].alias!.split("_")[1] },
    );

    return mappedChain;
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
    `${s.alias}${s.field ? `.${s.field} as ${s.field}_${s.add_alias} ` : " "}`;

  const open = (
    chain: Partial<Dependency> & { add_alias: string }[],
    offset = 0,
    isGroup = false,
  ) =>
    chain
      .map(
        (s, i) =>
          indent(i + offset) +
          step(s) +
          "then " +
          (isGroup ? (offset === 0 || i != chain.length - 1 ? "{" : "") : "{"),
      )
      .join("\n");

  const close = (n: number, from: number) =>
    Array.from({ length: n }, (_, i) => indent(from - i) + `} "";`).join("\n");

  const shift = (s: string) =>
    s
      .split("\n")
      .map((l: string) => indent(level) + l)
      .join("\n");
  
  const buildBlock = (
    sourceChain: Partial<Dependency> & { add_alias: string }[],
    targetChain: Partial<Dependency> & { add_alias: string }[],
    rule: string,
    isGroup: boolean,
    extraIndent = 0,
  ) =>
    shift(
      [
        open(sourceChain, 0, isGroup),
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
    );

  const printBlock =
    (
      variables: { sources: Dependency[]; targets: Dependency[] },
      node: FMLBaseEntity,
    ) =>
    (rule = "") => {
      const { sources, targets } = variables;

      if (isGroupNode(node)) {
        return buildBlock(
          getDependencies(node.sources, sources),
          getDependencies(node.targets, targets),
          rule,
          true,
        );
      }

      if (isRule(node)) {
        const sourceChain = getDependencies(
          node.rightParams.filter(isTransformParam),
          sources,
        );
        const targetChain = getDependencies([node.leftParam], sources);

        const extraIndent =
          sourceChain.length || targetChain.length ? level + 1 : 0;

        return buildBlock(sourceChain, targetChain, rule, false, extraIndent);
      }
    };

  const fixCreateBlock = (level: number) => indent(level) + '} "create";';

  const createBlock = printBlock(variables, node);

  for (const dep of dependencies.get(node.id) ?? []) {
    printRuleTree(dep, dependencies, variables, lines, level, visited);
  }

  const shouldPrint = isSourceOrTargetRule(node) || isGroupFMLNode(node);
  const isCreateRule = isCreate(node);

  if (shouldPrint) {
    const block = createBlock(variables.sources[0].alias + " -> " + node.toString());
    lines.push(block!);
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
