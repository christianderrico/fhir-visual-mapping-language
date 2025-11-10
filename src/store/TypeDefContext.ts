import { createContext } from "react";
import type { TypeDefMap } from "../model/fhir-types";

export const TypeDefContext = createContext<TypeDefMap>({
  get: () => undefined,
  getNonPrimitive: () => undefined,
});
