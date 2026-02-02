import {linter, type Diagnostic, type LintSource} from "@codemirror/lint"
import { checkSyntaxErrors } from "./check-syntax-errors";
import { checkTransformCall } from "./check-transform-call";
import type { EditorView } from "codemirror";

export const validation = linter(
  buildPipeline([
    checkSyntaxErrors,
    variableResolution,
    checkTransformCall,
  ])
)

function buildPipeline(steps: LintSource[]): LintSource {
  return async (view) => {
    for (const step of steps) {
      const errors = await step(view)
      if (errors.length) {
        return errors;
      }
    }
    return [];
  }
}

// TODO:
function variableResolution(view: EditorView): readonly Diagnostic[] | Promise<readonly Diagnostic[]> {
  console.log(view)
  return [];
}
