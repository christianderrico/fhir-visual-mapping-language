import type { Resource } from "src-common/fhir-types.ts";
import type { URL } from 'src-common/strict-types.ts';

export type TypeMap = Record<URL, Resource>;
