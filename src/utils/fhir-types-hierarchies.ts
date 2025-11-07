import type { Resource } from "./fhir-types"

type AbstractResource = Extract<Resource, { kind: 'resource' }>

export interface FhirTypeHierarchy {
  getImplementations(resource: Resource): Resource[]
}


