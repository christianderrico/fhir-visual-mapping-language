import { HighlightStyle, tags } from "@codemirror/highlight";

export const expressionHighlighting = HighlightStyle.define([
  { tag: tags.string, color: "#98c379" },
  { tag: tags.number, color: "#d19a66" },
  { tag: tags.variableName, color: "#61afef" },
  { tag: tags.punctuation, color: "#abb2bf" },
]);
