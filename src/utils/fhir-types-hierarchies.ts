import type { Resource } from "../model/fhir-types";

type AbstractResource = Extract<Resource, { kind: "resource" }>;

interface FhirTypeHierarchy {
  getImplementations(resource: Resource): Resource[];
}
