import { createContext } from "react";
import type { TypeDefMap } from "../utils/fhir-types";

export const TypeDefContext = createContext<TypeDefMap>({
  get: () => undefined,
  getNonPrimitive: () => undefined,
});
