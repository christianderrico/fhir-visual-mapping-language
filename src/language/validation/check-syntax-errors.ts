import {type LintSource} from "@codemirror/lint"
import {syntaxTree} from "@codemirror/language"

export const checkSyntaxErrors = (view => {
  const {state} = view;
  const tree = syntaxTree(view.state)

  if (state.doc.length === 0) return [];

  if (tree.length === state.doc.length) {
    let pos = null as number | null;
    tree.cursor().iterate(nodeRef => {
      if (pos === null && nodeRef.type.isError) {
        pos = nodeRef.from;
        return false;
      }
    })

    if (pos !== null) {
      return [{
        from: pos,
        to: pos+1,
        severity: "error",
        message: `Syntax error: unexpected character "${state.sliceDoc(pos, pos+1)}"`,
        source: "syntax"
      }]
    }
  }

  return [];
}) satisfies LintSource;
