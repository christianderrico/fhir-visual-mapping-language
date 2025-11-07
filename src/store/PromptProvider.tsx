import { createContext, useState, useContext } from "react";
import { PromptModal, type PromptType } from "../components/PromptModal";

// PromptProvider.tsx
const PromptContext = createContext<ReturnType<typeof useProvidePrompt> | null>(null);

export const PromptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useProvidePrompt();
  return (
    <PromptContext.Provider value={value}>
      {children}
      <PromptModal {...value.modalProps} />
    </PromptContext.Provider>
  );
};

function useProvidePrompt() {
  const [state, setState] = useState<{ prompt?: PromptType, resolve?: (value: any) => void }>({});

  const ask = <T,>(prompt: PromptType) => new Promise<T>((resolve) => setState({ prompt, resolve }));

  const close = () => setState({});
  const submit = (value: any) => {
    state.resolve?.(value);
    setState({});
  };

  return {
    askSelect: (options: string[]) => ask<string | undefined>({ type: 'select', options, title: 'Pick one' }),
    askText: (title: string) => ask({ type: 'text', title }),
    askMulti: (fields: any[]) => ask({ type: 'multi', fields, title: 'Fill form' }),
    modalProps: { opened: !!state.prompt, prompt: state.prompt, onSubmit: submit, onClose: close },
  };
}

export function usePrompt() {
  const ctx = useContext(PromptContext);
  if (!ctx) throw new Error('usePrompt must be used inside a <PromptProvider>');
  return ctx;
}
