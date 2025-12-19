import {LanguageSupport, syntaxTree} from '@codemirror/language'
import { styleTags, tags as t } from "@lezer/highlight";
import { autocompletion, CompletionContext, type CompletionResult, type CompletionSource } from "@codemirror/autocomplete"
import { LRLanguage, HighlightStyle, syntaxHighlighting} from "@codemirror/language";
import { parser } from 'src-generated/grammar/fhir-expression-parser';
import mapTransformValueSet from "src-generated/valueset-metadata/map-transform.json";
import type { TypeEnvironment } from 'src/model/type-environment';
import type { ScopeEnvironment } from 'src/model/scope-environment';
import type { SyntaxNode } from '@lezer/common';
import { describeFieldType } from 'src-common/fhir-types';

export const expressionLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      styleTags({
        "Variable/Identifier": t.variableName,
        "Property/Identifier": t.propertyName,
        "TransformCall/Identifier": t.keyword,
        String: t.string,
        Integer: t.number,
        Decimal: t.number,
        Boolean: t.bool,
        "( )" : t.paren,
        "," : t.separator,
        "." : t.derefOperator 
      })
    ]
  })
});

const transformFunctions = mapTransformValueSet.include[0].concept.map(
  ({ code, definition }) => ({
    label: code,
    type: "function",
    info: definition,
  }),
);

const expressionAutocompletion = (typeEnv: TypeEnvironment, scopeEnv: ScopeEnvironment) => (ctx: CompletionContext): CompletionResult | null => {
  const tree = syntaxTree(ctx.state);
  const node = tree.resolveInner(ctx.pos, -1);

  const isVariable = () => node.name === "Identifier" &&
    (node.parent?.name === "Variable" || node.parent?.name === "TransformCall");

  const isPointBlank = () => node.name === "Program";

  const isPropertyAccess = () => (node.name === "Identifier" && node.parent?.name === "Property")
    || node.name === "PropertyAccess";

  if ((
    isVariable()
  || (isPointBlank() && ctx.explicit)
  ) && node.from <= ctx.pos
  ) {
    return {
      from: node.from,
      options: [
        ...scopeEnv.getAll().map(value => ({
          label: value,
          type: "variable",
        })),
        ...transformFunctions,
      ]
    }
  }

  if (isPropertyAccess()) {
    const fieldAccessNode = findParent(node, { name: "FieldAccess" })!;
    const variableNode = fieldAccessNode.firstChild!;
    const fields = fieldAccessNode.getChildren("PropertyAccess").map(node => node.firstChild!);

    const variable = ctx.state.sliceDoc(variableNode.from, variableNode.to);

    const type = scopeEnv.get(variable);
    if (type === undefined) return null;

    const lastPropertyAccess = fieldAccessNode.lastChild!;
    const lastProperty = lastPropertyAccess.lastChild!
    
    const completeFrom = lastProperty.name === "Property" ? lastProperty.from : ctx.pos;

    if (fields.length === 1) {
      const fieldTypes = typeEnv.getTypeFields(type) ?? {};
      return {
        from: completeFrom,
        options: Object.values(fieldTypes).map((field) => ({
          label: field.name,
          type: "property",
          detail: describeFieldType(field)
        }))
      }
    }
    if (fields.length > 1) {
      const pathParts = fields.slice(0, -1).map(field => ctx.state.sliceDoc(field.from, field.to))
      const lastField = typeEnv.resolvePathType(type, pathParts);
      
      if (lastField === undefined) return null;

      if ("fields" in lastField) {
        return {
          from: completeFrom,
          options: Object.values(lastField.fields).map((field) => ({
            label: field.name,
            type: "property",
            detail: describeFieldType(field)
          }))
        }
      }

      if (lastField.kind === "complex") {
        const complexField = typeEnv.getTypeFields(lastField.value)
        return {
          from: completeFrom,
          options: Object.values(complexField ?? {}).map((field) => ({
            label: field.name,
            type: "property",
            detail: describeFieldType(field)
          }))
        }
      }

    }

    // const typeDef = typeEnv.resolvePathType(type, fieldText)
    // console.log(typeDef)


    // fieldAccessNode.cursor()

  }

  return null;
}
    // override: [
    //   (ctx) => {
    //     let word = ctx.matchBefore(/\w*/)!;
    //     const node = syntaxTree(ctx.state).resolveInner(ctx.pos, -1);
    //     console.log(syntaxTree(ctx.state));
    //     console.log(node);
    //     if (word.from == word.to && !ctx.explicit) return null;
    //     return {
    //       from: word.from,
    //       options: [
    //         ...transformFunctions,
    //         ...scopeEnv.getAll().map((value) => ({
    //           label: value,
    //           type: "variable",
    //         })),
    //       ],
    //     };
    //   },
    // ],

const expressionHighlightStyle = HighlightStyle.define([
  { tag: t.variableName, color: "#1c1d68" },
  { tag: t.propertyName, color: "#1c1d68", fontStyle: "italic" },
  { tag: t.keyword, color: "#1c1d68" },

  { tag: t.string, color: "#a11" },
  { tag: t.number, color: "#005cc5" },
  { tag: t.bool, color: "#d73a49" },
]);

export function expressionLanguageSupport(opts: { autocompletion?: {
  typeEnvironment: TypeEnvironment,
  scopeEnvironment: ScopeEnvironment,
} } = {}) {
  const extensions = [
    syntaxHighlighting(expressionHighlightStyle, { fallback: true }),
    ...(opts.autocompletion !== undefined ? [
      autocompletion({ override: [
        expressionAutocompletion(opts.autocompletion?.typeEnvironment, opts.autocompletion?.scopeEnvironment)
      ]})
    ] : [])
  ]
  return new LanguageSupport(expressionLanguage, [ extensions ])
}

function findParent(node: SyntaxNode, query: { name: Exclude<string, "Program">; }): SyntaxNode | undefined {
  if (node.name === "Program" || node.parent === null) return undefined;
  if (node.name === query.name) return node;
  return findParent(node.parent, query);
}
