import { type Edge, type Node } from "@xyflow/react";
import { FMLGroupNode, FMLNode } from "./fml-entities";
import {
  debugTree,
  findNode,
  isGroupNode,
  isTransformParam,
} from "./fml-utils";
import {
  attachParentChild,
  buildRuleFromEdge,
  collectDependencies,
  printRuleTree,
  createTreeVariables,
} from "./fml-graph-building-utils";
import _ from "lodash";

export interface GraphProps {
  templateName: string;
  groupNodesByTab: Record<string, Node[]>;
  nodes: Node[];
  edges: Edge[];
}

function getAllGroupsOrdered(
  groupNodesByTab: Record<string, Node[]>,
  groupKey = "Main",
) {
  let orderedGroups = [groupKey];
  const keys = groupNodesByTab[groupKey];
  orderedGroups = orderedGroups.concat(
    keys.flatMap((g) =>
      getAllGroupsOrdered(groupNodesByTab, g.id.replace(g.data.groupName, "")),
    ),
  );
  return orderedGroups;
}

export function generateTemplate(props: GraphProps) {
  const { templateName, groupNodesByTab, nodes, edges } = props;
  const ordered_groups = getAllGroupsOrdered(groupNodesByTab);

  const getGroupNodes =
    (type: "sourceNode" | "targetNode") =>
    (group: string): FMLNode[] =>
      getNodesByType(
        nodes.filter((n) => n.data.groupName === group),
        type,
      ).map((n) => new FMLNode(n));

  const srcs = getGroupNodes("sourceNode");
  const tgts = getGroupNodes("targetNode");

  const headers: string[] = [];
  let groups: string[] = [];

  ordered_groups.forEach((group) => {
    const header_group = generateHeaderTemplate(
      group,
      srcs,
      tgts,
      group === "Main" ? templateName : undefined,
    );
    header_group.forEach((line) => {
      if (!headers.includes(line)) {
        headers.push(line);
      }
    });
    const gNodes = nodes.filter((n) => n.data.groupName === group);
    const gEdges = edges.filter(
      (e) =>
        gNodes.find((n) => n.id === e.source) ||
        gNodes.find((n) => n.id === e.target),
    );
    groups = groups.concat(generateGroup(group, gNodes, gEdges, srcs, tgts));
  });

  const templateRow = [headers[0], headers[1]];
  const uses = headers.slice(2);

  uses.sort((a, b) => {
    const aIsSource = a.includes(" as source");
    const bIsSource = b.includes(" as source");

    if (aIsSource && !bIsSource) return -1;
    if (!aIsSource && bIsSource) return 1;

    return 0;
  });

  return [...[...templateRow, ...uses], ...groups].join("\n");
}

function generateHeaderTemplate(
  group: string,
  srcs: (group: string) => FMLNode[],
  tgts: (group: string) => FMLNode[],
  templateName?: string,
) {
  const sources = srcs(group);
  const targets = tgts(group);

  const srcs_strings = handleMultipleNodes(sources);
  const tgts_strings = handleMultipleNodes(targets);

  const lines = templateName
    ? [
        `map "http://hl7.org/fhir/StructureMap/${templateName}" = "${templateName}"`,
        "",
      ]
    : [];

  function addLine(toAdd: string[]) {
    toAdd.forEach((a) => lines.push(a));
  }

  addLine(srcs_strings);
  addLine(tgts_strings);

  return lines;
}

function getNodesByType(nodes: Node[], type: "sourceNode" | "targetNode") {
  return nodes.filter((n) => n.origin === undefined && n.type === type);
}

function handleMultipleNodes(nodes: FMLNode[]) {
  const sources = nodes.filter((n) => n.type === "sourceNode");
  if (sources.length > 0) {
    return sources.map((s) => `uses "${s.url}" alias ${s.resource} as source`);
  } else {
    const tgts = nodes.filter((n) => n.type === "targetNode");
    return tgts.map((t) => `uses "${t.url}" alias ${t.resource} as target`);
  }
}

function generateGroup(
  groupName: string,
  nodes: Node[],
  edges: Edge[],
  sources_gen: (group: string) => FMLNode[],
  targets_gen: (group: string) => FMLNode[],
) {
  const nodeMap = new Map<string, FMLNode>();

  const srcs = sources_gen(groupName);
  const tgts = targets_gen(groupName);
  const createFakeFMLNode = (id: string): FMLNode =>
    new FMLNode({
      id,
      type: "fakeNode",
      position: { x: 0, y: 0 },
      data: { alias: "FAKENODE" },
    });

  const mockFMLSource = createFakeFMLNode("fakeSource");
  const mockFMLTarget = createFakeFMLNode("fakeTarget");

  const attachChildren = (parent: FMLNode, children: FMLNode[]) => {
    children.forEach((child) => {
      child.father = parent;
      parent.addChild(child);
    });
  };

  attachChildren(mockFMLSource, srcs);
  attachChildren(mockFMLTarget, tgts);

  [mockFMLSource, mockFMLTarget, ...srcs, ...tgts].forEach((node) =>
    nodeMap.set(node.id, node),
  );

  const getOrCreateNode = (node: Node): FMLNode => {
    if (!nodeMap.has(node.id)) {
      const fmlNode =
        node.type === "groupNode" ? new FMLGroupNode(node) : new FMLNode(node);
      nodeMap.set(fmlNode.id, fmlNode);
    }
    return nodeMap.get(node.id)!;
  };

  edges.forEach((edge) => {
    const rule = buildRuleFromEdge(nodes, edge);
    const targetNode = getOrCreateNode(findNode(nodes, rule.leftParam.id));

    if (isTransformParam(rule.rightParam)) {
      const sourceNode = getOrCreateNode(findNode(nodes, rule.rightParam.id));

      if (rule.type === "sourceNode") {
        attachParentChild(sourceNode, rule);
        attachParentChild(rule, targetNode);
      } else if (rule.type === "targetNode") {
        const parent = rule.isReference ? sourceNode : targetNode;
        const child = rule.isReference ? targetNode : sourceNode;
        attachParentChild(parent, rule);
        if (!rule.isReference) attachParentChild(rule, child);
        else attachParentChild(child, rule);
      } else if (rule.type === "sourceTargetNode") {
        attachParentChild(sourceNode, rule);
        attachParentChild(targetNode, rule);
      } else if (rule.type === "groupNode") {
        if (isGroupNode(sourceNode)) {
          sourceNode.addTarget(rule);
          attachParentChild(targetNode, rule);
          attachParentChild(rule, sourceNode);
        } else if (isGroupNode(targetNode)) {
          targetNode.addSource(rule);
          attachParentChild(sourceNode, rule);
          attachParentChild(rule, targetNode);
        }
      }
    } else {
      attachParentChild(targetNode, rule);
    }
  });

  const lines = [];
  lines.push(
    "",
    `group ${groupName}(${[
      ...srcs.map(
        (s, i) => (i === 0 ? "" : " ") + `source ${s.alias} : ${s.resource}`,
      ),
    ]}, ${[...tgts.map((t) => `target ${t.alias} : ${t.resource}`)]}) {`,
  );

  const sourceTree = createTreeVariables(mockFMLSource);

  if (srcs.length === 0 || tgts.length === 0) {
    lines.push("}");
    return lines.join("\n");
  } else {
    const dependencies = collectDependencies(
      mockFMLTarget,
      (id) => nodeMap.get(id)!,
    );
    const result = printRuleTree(
      mockFMLTarget,
      dependencies,
      sourceTree,
      lines,
    );
    result.push("}");
    return result.join("\n");
  }
}
