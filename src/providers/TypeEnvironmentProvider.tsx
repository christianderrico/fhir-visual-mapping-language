import { createContext } from "react";
import type { TypeEnvironment } from "../model/type-environment";

export const TypeEnvironmentContext = createContext<TypeEnvironment | null>(
  null,
);

