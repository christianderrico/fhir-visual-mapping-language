import {type Diagnostic, type LintSource } from "@codemirror/lint"
import {syntaxTree} from "@codemirror/language"
import { transformWhitelist } from "../transform-whitelist";

export const checkTransformCall = ((view) => {
  let diagnostics: Diagnostic[] = [];

  syntaxTree(view.state).cursor().iterate(nodeRef => {
    if (nodeRef.name === "TransformCall") {
      const identifierNode = nodeRef.node.firstChild!;
      const value = view.state.sliceDoc(identifierNode.from, identifierNode.to);

      if (!transformWhitelist.includes(value)) {
        diagnostics.push({
          from: identifierNode.from,
          to: identifierNode.to,
          severity: "error",
          message: `Transform "${value}" is not allowed. Allowed transform values are: ${transformWhitelist.join(", ")}.`
        })
      }

      if (value === "uuid") {
        if (identifierNode.nextSibling !== null) {
          diagnostics.push({
            from: nodeRef.from,
            to: nodeRef.to,
            severity: "error",
            message: `Transform "uuid" takes 0 parameters.`
          })
        } 
      }
    }
  })

  return diagnostics;
}) satisfies LintSource;
