import { createContext, useState, useContext } from "react";
import {Tree} from '@lezer/common'
import { PromptModal, type PromptType } from "../components/PromptModal";
import type { ValueSetEntry } from "src-common/valueset-types";
import type { URL } from "src-common/strict-types";

const PromptContext = createContext<ReturnType<typeof useProvidePrompt> | null>(
  null,
);

export const PromptProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const value = useProvidePrompt();
  return (
    <PromptContext.Provider value={value}>
      {children}
      <PromptModal {...value.modalProps} />
    </PromptContext.Provider>
  );
};

function useProvidePrompt() {
  const [state, setState] = useState<{
    prompt?: PromptType;
    resolve?: (value: any) => void;
  }>({});

  const ask = <T,>(prompt: PromptType) =>
    new Promise<T>((resolve) => setState({ prompt, resolve }));

  const close = () => setState({});
  const submit = (value: any) => {
    state.resolve?.(value);
    setState({});
  };

  return {
    askOption: (options: ValueSetEntry[]) =>
      ask<string | undefined>({
        type: "select-option",
        options,
        title: "Select option",
      }),
    askAlternatives: (title:string, options: string[], placeholder?:string) => 
      ask<{ tree: Tree, value: string, option: string}>({
        type: 'alternatives',
        options,
        title,
        placeholder
      }),
    askImplementation: (options: URL[]) =>
      ask<URL | undefined>({
        type: "select-implementation",
        options,
        title: "Select implementation",
      }),
    askExpression: (title: string, placeholder?: string) =>
      ask<{ tree: Tree, value: string, condition?: string }>({ type: "expression", title, placeholder }),

    modalProps: {
      opened: !!state.prompt,
      prompt: state.prompt,
      onSubmit: submit,
      onClose: close,
    },
  };
}

export function usePrompt() {
  const ctx = useContext(PromptContext);
  if (!ctx) throw new Error("usePrompt must be used inside a <PromptProvider>");
  return ctx;
}
