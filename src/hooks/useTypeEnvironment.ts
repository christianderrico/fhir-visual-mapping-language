import { useContext } from "react";
import { TypeEnvironmentContext } from "../providers/TypeEnvironmentProvider";

export function useTypeEnvironment() {
  const typeEnv = useContext(TypeEnvironmentContext);
  if (typeEnv === null)
    throw new Error(
      "typeEnvironment must be set before using useTypeEnvironment"
    );
  return typeEnv;
}
