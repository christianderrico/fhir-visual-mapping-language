import { type Edge, type Node } from "@xyflow/react";
import { FMLGroupNode, FMLNode, FMLRule } from "./fml-entities";
import {
  findNode,
  isGroupNode,
  isTransformParam,
} from "./fml-utils";
import {
  attachParentChild,
  buildRules,
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
      getAllGroupsOrdered(
        groupNodesByTab,
        g.id.replace(g.data.groupName as string, ""),
      ),
    ),
  );
  return orderedGroups;
}

export function generateTemplate(props: GraphProps) {
  const { templateName, groupNodesByTab, nodes, edges } = props;
  const groupKey = Object.keys(groupNodesByTab)[0]
  const ordered_groups = getAllGroupsOrdered(groupNodesByTab, groupKey);

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

  const rules = buildRules(nodes, edges).filter(
    (r) => r != null && r != undefined,
  );
  rules
    .filter((r) => r.type !== "groupNode")
    .forEach((rule) => {
      rule = rule as FMLRule;
      const targetNode = getOrCreateNode(
        findNode(nodes, (rule as FMLRule).leftParam.id),
      );

      rule.rightParams.forEach((right) => {
        if (isTransformParam(right)) {
          const sourceNode = getOrCreateNode(findNode(nodes, right.id));
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
          }
        } else {
          attachParentChild(targetNode, rule);
        }
      });
    });

  rules
    .filter((r) => r.type === "groupNode")
    .forEach((rule) => {
      if (isGroupNode(rule)) {
        rule.sources.forEach((s) =>
          attachParentChild(getOrCreateNode(findNode(nodes, s.id)), rule),
        );
        rule.targets.forEach((t) =>
          attachParentChild(getOrCreateNode(findNode(nodes, t.id)), rule),
        );
      }
    });

  const sourceTree = createTreeVariables(mockFMLSource);
  const targetTree = createTreeVariables(mockFMLTarget);

  //debugTree(mockFMLTarget);
  //debugTree(mockFMLSource);

  let lines = [];
  lines.push(
    "",
    `group ${groupName}(${[
      ...srcs.map(
        (s, i) => (i === 0 ? "" : " ") + `source ${s.alias} : ${s.resource}`,
      ),
    ]}${srcs.length > 0 ? ", " : ""}${[...tgts.map((t) => `target ${t.alias} : ${t.resource}`)]}) {`,
  );

  if (srcs.length > 0 && tgts.length > 0) {
    const dependencies = collectDependencies(
      mockFMLTarget,
      (id) => nodeMap.get(id)!,
    );
    lines = printRuleTree(
      mockFMLTarget,
      dependencies,
      { sources: sourceTree, targets: targetTree },
      lines,
    );
  }

  lines.push("}");
  //console.log(lines.join("\n"))
  return lines.join("\n");
}
