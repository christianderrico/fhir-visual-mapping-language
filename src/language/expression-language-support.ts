import {LanguageSupport, syntaxTree} from '@codemirror/language'
import { styleTags, tags as t } from "@lezer/highlight";
import { autocompletion } from "@codemirror/autocomplete"
import { LRLanguage, HighlightStyle, syntaxHighlighting} from "@codemirror/language";
import { parser } from 'src-generated/grammar/fhir-expression-parser';
import mapTransformValueSet from "src-generated/valueset-metadata/map-transform.json";
import type { TypeEnvironment } from 'src/model/type-environment';
import type { ScopeEnvironment } from 'src/model/scope-environment';

export const expressionLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      styleTags({
        Identifier: t.variableName,
        String: t.string,
        Integer: t.number,
        Decimal: t.number,
        Boolean: t.bool,
        "FieldAccess/Identifier": t.propertyName,
        "TransformCall/Identifier": t.keyword,
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

const expressionAutocompletion = (typeEnv: TypeEnvironment, scopeEnv: ScopeEnvironment) => autocompletion({
    override: [
      (ctx) => {
        let word = ctx.matchBefore(/\w*/)!;
        const node = syntaxTree(ctx.state).resolveInner(ctx.pos, -1);
        console.log(syntaxTree(ctx.state));
        console.log(node);
        if (word.from == word.to && !ctx.explicit) return null;
        return {
          from: word.from,
          options: [
            ...transformFunctions,
            ...scopeEnv.getAll().map((value) => ({
              label: value,
              type: "variable",
            })),
          ],
        };
      },
    ],
  });

const expressionHighlightStyle = HighlightStyle.define([
  { tag: t.variableName, color: "#1c1d68", fontWeight: "bold" },
  { tag: t.keyword, fontStyle: "italic" },


  { tag: t.string, color: "#a11" },
  { tag: t.number, color: "#005cc5" },
  { tag: t.bool, color: "#d73a49" },
]);

export function expressionLanguageSupport() {
  return new LanguageSupport(expressionLanguage, [ syntaxHighlighting(expressionHighlightStyle, { fallback: true })])
}
