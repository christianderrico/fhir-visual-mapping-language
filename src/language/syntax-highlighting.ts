import { HighlightStyle, tags as t, styleTags } from "@codemirror/highlight";

export const expressionHighlightStyle = HighlightStyle.define([
  { tag: t.variableName, color: "#005cc5" },
  { tag: t.propertyName, color: "#6f42c1" },
  { tag: t.function(t.variableName), color: "#6f42c1", fontWeight: "bold" },

  { tag: t.string, color: "#032f62" },
  { tag: t.number, color: "#005cc5" },
  { tag: t.bool, color: "#d73a49" },

  { tag: t.paren, color: "#24292e" },
  { tag: t.separator, color: "#24292e" },
  { tag: t.derefOperator, color: "#24292e" },
]);
