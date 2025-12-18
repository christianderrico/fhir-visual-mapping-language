import { type Edge, type Node } from "@xyflow/react";
import { FMLGraph, FMLNode } from "./fml-entities";
import { findNode } from "./fml-utils";
import { attachParentChild, buildRuleFromEdge, printVariablesTree, collectDependencies, printRuleTree } from "./fml-graph-building-utils";

export function createGraph(templateName: string, nodes: Node[], edges: Edge[]) {
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
        attachParentChild(sourceNode, rule);
        attachParentChild(rule, targetNode);
      } else if (rule.type === "targetNode") {
        const parent = rule.isReference ? sourceNode : targetNode
        const child = rule.isReference ? targetNode : sourceNode
        attachParentChild(parent, rule);
        if(!rule.isReference)
          attachParentChild(rule, child);
        else
          attachParentChild(child, rule);
      } else if (rule.type === "both") {
        attachParentChild(sourceNode, rule);
        attachParentChild(targetNode, rule);
      }
    } else {
      attachParentChild(targetNode, rule);
    }
  });
  const source = graph.getSourceRoot() as FMLNode;
  const target = graph.getTargetRoot() as FMLNode;

  const dependencies = collectDependencies(target, (id) => nodeMap.get(id)!)

  const lines = [
    `map "http://hl7.org/fhir/StructureMap/${templateName}" = "${templateName}"`,
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
      (level, lines) => printRuleTree(target, dependencies, level, lines),
      1,
      lines,
    ) + "\n}";
  return result;
}
