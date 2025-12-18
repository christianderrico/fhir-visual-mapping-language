import { keymap } from "@codemirror/view";

export const noNewLines = keymap.of([
  {
    key: "Enter",
    run: () => {
      console.log("ENTERERRR")
      return true
    }, // swallow Enter
  },
]);
