import { useEffect, useRef } from "react";
import { basicSetup, EditorView } from "codemirror";
import { EditorState } from "@codemirror/state";
import { autocompletion, closeBrackets } from "@codemirror/autocomplete";
import {
  bracketMatching,
  syntaxHighlighting,
  syntaxTree,
} from "@codemirror/language";
import entries from "src-generated/valueset-metadata/map-transform.json";
import { noNewLines } from "src/language/no-newlines-keymap";
import { useTypeEnvironment } from "src/hooks/useTypeEnvironment";
import { SimpleScopeEnvironment } from "src/model/scope-environment";
import { url } from "src-common/strict-types";
import { expressionLanguageSupport } from "src/language/expression-language-support";
import { defaultHighlightStyle } from "@codemirror/language";

type Props = {
  value: string;
  onChange: (value: string) => void;
  extensions?: any[];
};

export function ExpressionEditor({ value, onChange, extensions = [] }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const typeEnv = useTypeEnvironment();
  const scopeEnv = new SimpleScopeEnvironment();

  useEffect(() => {
    scopeEnv.set(
      "motuPatient_1",
      url("http://hl7.org/fhir/StructureDefinition/MotuPatient"),
    );
  }, []);

  // Create editor once
  useEffect(() => {
    if (!ref.current) return;

    const transformFunctions = entries.include[0].concept.map(
      ({ code, definition }) => ({
        label: code,
        type: "function",
        info: definition,
      }),
    );

    const state = EditorState.create({
      doc: value,
      extensions: [
        // closeBrackets(),
        // bracketMatching(),
        expressionLanguageSupport(),
        // syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        noNewLines,
        autocompletion({
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
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString();
            onChange(newValue);
          }
        }),
        ...extensions,
      ],
    });

    const view = new EditorView({
      state,
      parent: ref.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Sync external value → editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const current = view.state.doc.toString();
    if (value !== current) {
      view.dispatch({
        changes: {
          from: 0,
          to: current.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return <div ref={ref} />;
}
