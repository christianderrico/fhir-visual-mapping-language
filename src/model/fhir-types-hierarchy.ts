import type { TypeDefMap } from "../model/fhir-typesr-types";

export interface FhirTypesHierarchy {
  getImplementations(type: string): string[];
}

export class FhirTypesHierarchyImpl implements FhirTypesHierarchy {

  constructor(private typeDefMap: TypeDefMap) { }

  getImplementations(type: string): string[] {
    return [
      "Identifier",
      "Patient",
      "Bundle",
    ]
  }
}
