import mapTransformValueSet from "src-generated/valueset-metadata/map-transform.json";
import { transformWhitelist } from "./transform-whitelist";
import { describeFieldType } from "src-common/fhir-types";
import type { ScopeEnvironment } from "src/model/scope-environment";
import type { TypeEnvironment } from "src/model/type-environment";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode } from "@lezer/common";
import {
  CompletionContext,
  type CompletionSource,
} from "@codemirror/autocomplete";

const transformFunctions = mapTransformValueSet.include[0].concept.filter(({code}) => transformWhitelist.includes(code)).map(
  ({ code, definition }) => ({
    label: code,
    type: "function",
    info: definition,
  }),
);

export const expressionAutocompletion =
  (typeEnv: TypeEnvironment, scopeEnv: ScopeEnvironment): CompletionSource =>
  (ctx: CompletionContext) => {
    const tree = syntaxTree(ctx.state);
    const node = tree.resolveInner(ctx.pos, -1);

    const isVariable = () =>
      node.name === "Identifier" &&
      (node.parent?.name === "Variable" ||
        node.parent?.name === "TransformCall");
    const isPointBlank = () => node.name === "Program";
    const isPropertyAccess = () =>
      (node.name === "Identifier" && node.parent?.name === "Property") ||
      node.name === "PropertyAccess";

    if (
      (isVariable() || (isPointBlank() && ctx.explicit)) &&
      node.from <= ctx.pos
    ) {
      return {
        from: node.from,
        options: [
          ...scopeEnv.getAll().map((value) => ({
            label: value,
            type: "variable",
          })),
          ...transformFunctions,
        ],
      };
    }

    if (isPropertyAccess()) {
      const fieldAccessNode = findParent(node, { name: "FieldAccess" })!;
      const variableNode = fieldAccessNode.firstChild!;
      const fields = fieldAccessNode
        .getChildren("PropertyAccess")
        .map((node) => node.firstChild!);

      const variable = ctx.state.sliceDoc(variableNode.from, variableNode.to);

      const type = scopeEnv.get(variable);
      if (type === undefined) return null;

      const lastPropertyAccess = fieldAccessNode.lastChild!;
      const lastProperty = lastPropertyAccess.lastChild!;

      // If we're in the middle of writing a field, complete from that.
      // Otherwise just start from "."
      const completeFrom =
        lastProperty.name === "Property" ? lastProperty.from : ctx.pos;

      if (fields.length === 1) {
        const fieldTypes = typeEnv.getTypeFields(type) ?? {};
        return {
          from: completeFrom,
          options: Object.values(fieldTypes).map((field) => ({
            label: field.name,
            type: "property",
            detail: describeFieldType(field),
          })),
        };
      }
      if (fields.length > 1) {
        const pathParts = fields
          .slice(0, -1)
          .map((field) => ctx.state.sliceDoc(field.from, field.to));
        const lastField = typeEnv.resolvePathType(type, pathParts);

        if (lastField === undefined) return null;

        if ("fields" in lastField) {
          return {
            from: completeFrom,
            options: Object.values(lastField.fields).map((field) => ({
              label: field.name,
              type: "property",
              detail: describeFieldType(field),
            })),
          };
        }

        if (lastField.kind === "complex") {
          const complexField = typeEnv.getTypeFields(lastField.value);
          return {
            from: completeFrom,
            options: Object.values(complexField ?? {}).map((field) => ({
              label: field.name,
              type: "property",
              detail: describeFieldType(field),
            })),
          };
        }
      }
    }

    return null;
  };

function findParent(
  node: SyntaxNode,
  query: { name: Exclude<string, "Program"> },
): SyntaxNode | undefined {
  if (node.name === "Program" || node.parent === null) return undefined;
  if (node.name === query.name) return node;
  return findParent(node.parent, query);
}
