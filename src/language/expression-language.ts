import { StreamLanguage } from "@codemirror/language";

export const expressionLanguage = StreamLanguage.define({
  name: "FHIRPath",
  startState: () => ({}),

  token(stream) {
    if (stream.match(/[a-zA-Z_][a-zA-Z0-9_]*/)) {
      return "variableName";
    }
    if (stream.match(/\.[a-zA-Z_][a-zA-Z0-9_]*/)) {
      return "propertyName"
    }
    if (stream.match(/"(?:[^"\\]|\\.)*"/)) {
      return "string";
    }
    if (stream.match(/\d+(\.\d+)?/)) {
      return "number";
    }
    if (stream.match(/[(),]/)) {
      return "punctuation";
    }
    stream.next();
    return null;
  },
});
