import type { useFlow } from "src/providers/FlowProvider";
import type { SyntaxNode, Tree } from "@lezer/common";
import { Datatype } from "src-common/fhir-types";
import type { XYPosition } from "@xyflow/react";
import {v4 as uuid} from 'uuid';

export interface EvaluationContext {
  data: {
    xyPos: XYPosition,
    target: string,
    targetHandle: string | null,
  },
  flow: ReturnType<typeof useFlow>;
}

export function evaluateReference(
  node: SyntaxNode,
  doc: string,
  ctx: EvaluationContext,
): void {
  const cursor = node.cursor();
  cursor.firstChild();
  console.log("evaluateReference")
  console.log(cursor)
  console.log('params', node, ctx.data.target, ctx.data.targetHandle)
  if (cursor.name === "Variable") {
    const identifier = doc.slice(cursor.from, cursor.to);
    const node = ctx.flow.getActiveNodesAndEdges().nodes.find(x => x.data.alias === identifier)!.id;
    const edgeId = ctx.data.target + "." + ctx.data.targetHandle;
    ctx.flow.addEdge({
      id: edgeId,
      source: node,
      target: ctx.data.target, 
      targetHandle: ctx.data.targetHandle,
    });
  } else if (cursor.name === "FieldAccess") {
    cursor.firstChild(); // Variable
    const identifier = doc.slice(cursor.from, cursor.to);
    const propertyChain = [];
    while (cursor.nextSibling()) {
      // PropertyAccess+
      cursor.firstChild();
      const property = doc.slice(cursor.from, cursor.to);
      propertyChain.push(property);
      cursor.parent();
    }

    // TODO: Unroll chain
    console.group(identifier);
    console.log(propertyChain);
    console.groupEnd();

    if (propertyChain.length > 1) {
      throw new Error("TODO: implement chain unrolling");
    }

    const node = ctx.flow.getActiveNodesAndEdges().nodes.find(x => x.data.alias === identifier)!.id;

    const edgeId = ctx.data.target + "." + ctx.data.targetHandle;
    console.log('Reference', edgeId)
    ctx.flow.addEdge({
      id: edgeId,
      source: node,
      sourceHandle: propertyChain[0],
      target: ctx.data.target, 
      targetHandle: ctx.data.targetHandle,
    })
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
      args: [
        { datatype, value: value }

      ],
      groupName: ctx.flow.activeTab,
    }
  })

  const edgeId = ctx.data.target + "." + ctx.data.targetHandle;
  ctx.flow.addEdge({
    id: edgeId,
    source: nodeId,
    target: ctx.data.target,
    targetHandle: ctx.data.targetHandle,
  })

  console.log("literal", doc.slice(node.from, node.to));
}

export function evaluate(
  tree: Tree,
  doc: string,
  ctx: EvaluationContext,
): void {
  const cursor = tree.cursor(); // program
  cursor.firstChild(); // expression
  cursor.firstChild(); // TransformCall | Reference | Literal
  switch (cursor.name) {
    case "TransformCall":
      cursor.firstChild(); // Identifier
      const transformName = doc.slice(cursor.from, cursor.to);
      cursor.nextSibling(); // TransformArgs
      cursor.firstChild(); // TransformArg

      const nodeId = uuid();
      ctx.flow.addNode({
        id: nodeId,
        position: ctx.data.xyPos,
        origin: [0.5, 0.0] as [number, number],
        type: "transformNode",
        data: {
          transformName,
          args: [
          ],
          groupName: ctx.flow.activeTab,
        }
      })

      const edgeId = ctx.data.target + "." + ctx.data.targetHandle;
      ctx.flow.addEdge({
        id: edgeId,
        source: nodeId,
        target: ctx.data.target,
        targetHandle: ctx.data.targetHandle,
      })

      console.group(transformName);

      const newCtx = {...ctx};
      let targetHandleNum = 0;
      newCtx.data.xyPos = {...newCtx.data.xyPos, x: newCtx.data.xyPos.x - 150 };
      newCtx.data.target = nodeId;
      newCtx.data.targetHandle = targetHandleNum.toString();

      do {
        cursor.firstChild(); // Reference | Literal
        if ((cursor.name as string) === "Reference") {
          evaluateReference(cursor.node, doc, newCtx);
        } else if ((cursor.name as string) === "Literal") {
          evaluateLiteral(cursor.node, doc, newCtx);
        }
        newCtx.data.xyPos = { x: newCtx.data.xyPos.x, y: newCtx.data.xyPos.y + 50 };
        targetHandleNum++;
        newCtx.data.targetHandle = targetHandleNum.toString();
        cursor.parent(); // TransformArg
      } while (cursor.nextSibling());
      console.groupEnd();
      break;
    case "Reference":
      evaluateReference(cursor.node, doc, ctx);
      break;
    case "Literal":
      evaluateLiteral(cursor.node, doc, ctx);
      break;
  }
}
