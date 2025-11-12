import type { Resource } from "./fhir-types";
import type { URL } from './strict-types.ts';

export type TypeMap = Record<URL, Resource>;
