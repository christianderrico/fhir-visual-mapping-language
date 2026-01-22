import { useEffect, useRef, useState } from "react";
import { EditorView } from "codemirror";
import { EditorState } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { forEachDiagnostic } from "@codemirror/lint";
import { useTypeEnvironment } from "src/hooks/useTypeEnvironment";
import { SimpleScopeEnvironment } from "src/model/scope-environment";
import { type URL } from "src-common/strict-types";
import { expressionLanguageSupport } from "src/language/expression-language-support";
import { Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useFlow } from "src/providers/FlowProvider";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onValidate?: () => void;
  extensions?: any[];
};

type Diagnostic = {
  from: number;
  to: number;
  message: string;
};

export function ExpressionEditor({
  value,
  onChange,
  onValidate,
  extensions = [],
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const typeEnv = useTypeEnvironment();
  const { getActiveNodesAndEdges } = useFlow();
  const nodes = getActiveNodesAndEdges()
    .nodes.filter((x) => x.type === "sourceNode")
    .map((x) => [x.data.alias, x.data.type.url] as [string, URL]);
  const scopeEnv = new SimpleScopeEnvironment(Object.fromEntries(nodes));
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);

  // Create editor once
  useEffect(() => {
    if (!ref.current) return;

    function collectDiagnostics() {
      const result = [] as Diagnostic[];
      forEachDiagnostic(viewRef.current!.state, (d) => result.push(d));
      setDiagnostics(result);
    }

    const state = EditorState.create({
      doc: value,
      extensions: [
        expressionLanguageSupport({
          autocompletion: {
            typeEnvironment: typeEnv,
            scopeEnvironment: scopeEnv,
          },
          validation: true,
        }),
        keymap.of([
          {
            key: "Enter",
            run: () => true,
          },
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString();
            onChange(newValue);
          }
        }),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) {
            collectDiagnostics();
          }
        }),
        EditorView.theme({
          "&": {
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "4px 40px 4px 8px",
            "&.cm-focused": {
              outline: "none",
            },
          },
          ".cm-content": {
            whiteSpace: "nowrap",
            overflowX: "auto",
            fontFamily: "monospace",
          },
        }),
        ...extensions,
      ],
    });

    const view = new EditorView({ state });

    ref.current.prepend(view.dom);
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

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 7,
          right: 10,
        }}
      >
        <Tooltip label="Press CTRL-Space to autocomplete" position="bottom">
          <IconInfoCircle />
        </Tooltip>
      </div>
      <ul>
        {diagnostics.map(({ message, from, to }) => (
          <li key={message}>
            {message} ({from}:{to})
          </li>
        ))}
      </ul>
    </div>
  );
}
