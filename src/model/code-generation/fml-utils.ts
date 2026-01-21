import type { Field } from "src-common/fhir-types";
import type {
  NodeType,
  Parameter,
  TransformParameter,
  ValueParameter,
} from "./fml-types";
import { FMLGroupNode, FMLRule, type FMLBaseEntity, type FMLNode } from "./fml-entities";
import type { Node } from "@xyflow/react";

export function toFMLNodeType(type: string): NodeType {
  switch (type) {
    case "sourceNode":
      return "sourceNode";
    case "targetNode":
      return "targetNode";
    case "groupNode":
      return "groupNode";
    default:
      return "sourceTargetNode";
  }
}

export function getType(sourceType: NodeType, targetType: NodeType): NodeType {
  if(sourceType === "groupNode" || targetType === "groupNode")
    return 'groupNode'
  if (sourceType === targetType) return sourceType;
  return "sourceTargetNode";
}

function fieldExtractType(field: Field): string {
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
    resource: node.data.type
      ? fieldExtractType(node.data.type as Field)
      : field?.replace("source-", "").replace("target-", ""),
    alias: node.data.alias,
    field,
  };
}

export function isRule(node: FMLBaseEntity): node is FMLRule {
  return "action" in node;
}

export function isGroupNode(node: FMLBaseEntity): node is FMLGroupNode {
  return node.type === "groupNode"
}

export function isNode(node: FMLBaseEntity): node is FMLNode {
  return "url" in node;
}

export function valueParam(value: string): ValueParameter {
  return { type: "value", value };
}

export function isTransformParam(p: Parameter): p is TransformParameter {
  return p.type === "transform";
}

export function findNode(nodes: Node[], id: string): Node {
  const node = nodes.find((n) => n.id === id);
  if (!node) throw new Error(`Node with id '${id}' not found`);
  return node;
}

export function debugTree(node: FMLBaseEntity, level = 0) {
  console.log(" ".repeat(level) + node.toString());
  node.children.forEach((n) => debugTree(n, level + 1));
}
