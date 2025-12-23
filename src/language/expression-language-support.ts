import { LanguageSupport } from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import { autocompletion, } from "@codemirror/autocomplete";
import {
  LRLanguage,
  HighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { parser } from "src-generated/grammar/fhir-expression-parser";
import type { TypeEnvironment } from "src/model/type-environment";
import type { ScopeEnvironment } from "src/model/scope-environment";
import { validation } from "./validation";
import { expressionAutocompletion } from "./autocompletion";

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
        "( )": t.paren,
        ",": t.separator,
        ".": t.derefOperator,
      }),
    ],
  }),
});


const expressionHighlightStyle = HighlightStyle.define([
  { tag: t.variableName, color: "#1c1d68" },
  { tag: t.propertyName, color: "#1c1d68", fontStyle: "italic" },
  { tag: t.keyword, color: "#1c1d68" },

  { tag: t.string, color: "#a11" },
  { tag: t.number, color: "#005cc5" },
  { tag: t.bool, color: "#d73a49" },
]);

export function expressionLanguageSupport(
  opts: {
    autocompletion?: {
      typeEnvironment: TypeEnvironment;
      scopeEnvironment: ScopeEnvironment;
    },
    validation?: boolean
  } = {},
) {
  const extensions = [
    syntaxHighlighting(expressionHighlightStyle, { fallback: true }),
    ...(opts.autocompletion !== undefined
      ? [
          autocompletion({
            override: [
              expressionAutocompletion(
                opts.autocompletion?.typeEnvironment,
                opts.autocompletion?.scopeEnvironment,
              ),
            ],
          }),
        ]
      : []),
    ...(opts.validation ? [validation] : [])
  ];
  return new LanguageSupport(expressionLanguage, [extensions]);
}
