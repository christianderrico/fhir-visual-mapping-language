import type { DefinedType, Field, Resource } from "src-common/fhir-types";
import type { URL } from "src-common/strict-types";
import type { TypeEnvironment } from "./type-environment";

export type NonPrimitiveResource = Exclude<
  Resource,
  { kind: "primitive-type" }
>;

export type ElementLikeField = Extract<
  Field,
  { kind: "element" | "backbone-element" }
>;
export type ComplexField = Extract<Field, { kind: "complex" }>;

export function isElementLike(field: Field): field is ElementLikeField {
  return field.kind === "element" || field.kind === "backbone-element";
}

export const getNonPrimitiveType =
  (typeEnvironment: TypeEnvironment) =>
  (typeName: URL | DefinedType): NonPrimitiveResource | undefined => {
    const read = typeEnvironment.getType(typeName);
    if (read?.kind === "primitive-type") return undefined;
    return read;
  };
