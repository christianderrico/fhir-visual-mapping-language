import { createContext, useContext } from "react";
import type { TypeEnvironment } from "../model/type-environment";

export const TypeEnvironmentContext = createContext<TypeEnvironment | null>(
  null,
);

export function useTypeEnvironment() {
  const typeEnv = useContext(TypeEnvironmentContext);
  if (typeEnv === null)
    throw new Error(
      "typeEnvironment must be set before using useTypeEnvironment",
    );
  return typeEnv;
}
