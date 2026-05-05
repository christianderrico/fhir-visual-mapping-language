import type { useFlow } from "src/providers/FlowProvider";
import type { SyntaxNode, Tree } from "@lezer/common";
import { Datatype } from "src-common/fhir-types";
import type { XYPosition } from "@xyflow/react";
import { v4 as uuid } from "uuid";

export interface EvaluationContext {
  data: {
    xyPos: XYPosition;
    target: string;
    targetHandle: string | null;
    condition?: string;
  };
  flow: ReturnType<typeof useFlow>;
}

type VisitorMap = {
  [nodeName: string]: (node: SyntaxNode, doc: string, ctx: EvaluationContext) => void;
};

export function visit(
  node: SyntaxNode,
  doc: string,
  ctx: EvaluationContext,
  visitors: VisitorMap,
): void {

  const handler = visitors[node.name];

  if (handler) {
    handler(node, doc, ctx);
    return;
  }

  let child = node.firstChild;
  while (child) {
    visit(child, doc, ctx, visitors);
    child = child.nextSibling;
  }
}

export function evaluatePostfix(
  node: SyntaxNode,
  doc: string,
  ctx: EvaluationContext,
  visitors: VisitorMap
): void {
  const firstChild = node.firstChild!;
  const lastChild = node.lastChild!;

  const getNode: (alias: string) => string = (alias) => {
    return ctx.flow
      .getActiveNodesAndEdges()
      .nodes.find((x) => x.data.alias === alias)!.id;
  }

  const getVariable: (node: SyntaxNode | null | undefined) => string = (node) => {
    const cursor = node?.cursor();
    return doc.slice(cursor?.from, cursor?.to);
  }

  if(firstChild.name === "FpPrimary" && firstChild.firstChild?.name === "Identifier"){
    const variable = getVariable(firstChild.firstChild?.firstChild)

    const node = getNode(variable)
    const edgeId = ctx.data.target + "." + ctx.data.targetHandle;

    ctx.flow.addEdge({
      id: edgeId,
      source: node,
      target: ctx.data.target,
      targetHandle: ctx.data.targetHandle,
    });
  } else if (lastChild.name === "Identifier" && firstChild.name === "FpPostfix") {
    const variable = getVariable(firstChild.firstChild?.firstChild)
    const field = getVariable(lastChild)

    const node = getNode(variable)
    const edgeId = ctx.data.target + "." + ctx.data.targetHandle;

    ctx.flow.addEdge({
      id: edgeId,
      source: node,
      sourceHandle: field,
      target: ctx.data.target,
      targetHandle: ctx.data.targetHandle,
    });
  } else if (lastChild.name === "FpExpression") {
    // TODO
  } else {
    visit(firstChild, doc, ctx, visitors);
  }
}

export function evaluateLiteral(
  node: SyntaxNode,
  doc: string,
  ctx: EvaluationContext,
): void {
  const cursor = node.cursor();
  cursor.firstChild();
  let datatype: Datatype;
  let value: string = doc.slice(node.from, node.to);
  if (cursor.name === "Boolean") {
    datatype = Datatype.BOOLEAN;
  } else if (cursor.name === "Decimal") {
    datatype = Datatype.DECIMAL;
  } else if (cursor.name === "Integer") {
    datatype = Datatype.INTEGER;
  } else {
    datatype = Datatype.STRING;
    value = value.slice(1, -1);
  }

  const nodeId = `literal_${cursor.name.toLowerCase()}_${value}`;
  ctx.flow.addNode({
    id: nodeId,
    position: ctx.data.xyPos,
    origin: [0.5, 0.0] as [number, number],
    type: "transformNode",
    data: {
      transformName: "const",
      args: [{ datatype, value: value }],
      groupName: ctx.flow.activeTab,
    },
  });

  ctx.flow.addEdge({
    id: uuid(),
    source: nodeId,
    target: ctx.data.target,
    targetHandle: ctx.data.targetHandle,
  });

  console.log("literal", doc.slice(node.from, node.to));
}

export function evaluateCall(
  node: SyntaxNode,
  doc: string,
  ctx: EvaluationContext,
  visitors: VisitorMap,
): void {
  const identNode = node.firstChild!;
  const argListNode = identNode.nextSibling;
  const transformName = doc.slice(identNode.from, identNode.to);
  const nodeId = uuid();

  ctx.flow.addNode({
    id: nodeId,
    position: ctx.data.xyPos,
    origin: [0.5, 0.0],
    type: "transformNode",
    data: {
      transformName,
      args: transformName === "uuid"
        ? [{ datatype: Datatype.STRING, value: "uuid_" + ctx.data.target }]
        : [],
      groupName: ctx.flow.activeTab,
    },
  });

  ctx.flow.addEdge({
    id: ctx.data.target + "." + ctx.data.targetHandle,
    type: "customEdge",
    source: nodeId,
    target: ctx.data.target,
    targetHandle: ctx.data.targetHandle,
    data: { condition: ctx.data.condition },
  });

  let argChild = argListNode?.firstChild ?? null;
  let argIndex = 0;
  while (argChild) {
    visit(argChild, doc, {
      ...ctx,
      data: {
        ...ctx.data,
        target: nodeId,
        targetHandle: argIndex.toString(),
        xyPos: {
          x: ctx.data.xyPos.x - 150,
          y: ctx.data.xyPos.y + argIndex * 50,
        },
      },
    }, visitors);
    argIndex++;
    argChild = argChild.nextSibling;
  }
}

export function evaluate(tree: Tree, doc: string, ctx: EvaluationContext): void {
  const visitors: VisitorMap = {
    Call: (node, doc, ctx) => evaluateCall(node, doc, ctx, visitors),
    FpPostfix: (node, doc, ctx) => evaluatePostfix(node, doc, ctx, visitors),
    Literal: (node, doc, ctx) => evaluateLiteral(node, doc, ctx),
  }

  visit(tree.topNode, doc, ctx, visitors);
}
