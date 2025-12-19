import { createContext, useState, useContext } from "react";
import { PromptModal, type PromptType } from "../components/PromptModal";
import type { ValueSetEntry } from "src-common/valueset-types";
import type { Datatype } from "src-common/fhir-types";
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
    askImplementation: (options: URL[]) =>
      ask<URL | undefined>({
        type: "select-implementation",
        options,
        title: "Select implementation",
      }),
    askExpression: (title: string, placeholder?: string) =>
      ask<any>({ type: "expression", title, placeholder }),
    askText: (title: string, placeholder?: string) =>
      ask<string>({ type: "text", title, placeholder }),
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
