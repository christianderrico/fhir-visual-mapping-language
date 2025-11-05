import { createContext } from "react";
import type { TypeDefMap } from "../utils/types";

export const TypeDefContext = createContext<TypeDefMap>({});