import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { dropCursor } from "@codemirror/view";
import { autocompletion, closeBrackets } from "@codemirror/autocomplete";
import { bracketMatching, syntaxTree } from "@codemirror/language";
import entries from "src-generated/valueset-metadata/map-transform.json";

type Props = {
  value: string;
  onChange: (value: string) => void;
  extensions?: any[];
};

export function ExpressionEditor({ value, onChange, extensions = [] }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Create editor once
  useEffect(() => {
    if (!ref.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        closeBrackets(),
        bracketMatching(),
        autocompletion({
          override: [
            (ctx) => {
              console.log(syntaxTree(ctx.state));
              let word = ctx.matchBefore(/\w*/)!;
              // console.log(word);
              if (word.from == word.to && !ctx.explicit) return null;
              return {
                from: word.from,
                options: entries.include[0].concept.map(
                  ({ code, definition }) => ({
                    label: code,
                    type: "function",
                    info: definition,
                  }),
                ),
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
