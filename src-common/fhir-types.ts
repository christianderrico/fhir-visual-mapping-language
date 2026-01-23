import { FHIRResourceTypes, type FHIRResourceType } from "src-generated/FHIRResourceTypes";
import type { URL } from "./strict-types";
import { FHIRDataTypes, type FHIRDataType } from "src-generated/FHIRDataTypes";

export type DefinedType = FHIRResourceType | FHIRDataType;

export function isDefinedType(any: any): any is DefinedType {
  return new Set(FHIRResourceTypes).has(any) || new Set(FHIRDataTypes).has(any);
}

/**
 * Represent a type corresponding to a `StructureDefinition` instance.
 * @note `kind` is corresponding to `StructureDefinition['type']`
 */
export type Resource = BaseResource &
  (
    | { kind: "resource"; fields: Record<string, Field> }
    | { kind: "complex-type"; fields: Record<string, Field> }
    | { kind: "logical"; fields: Record<string, Field> }
    | { kind: "primitive-type"; value: Datatype }
  );

interface BaseResource {
  url: URL;
  /**
   * Computer-friendly name
   */
  name: string;
  /**
   * Human-friendly name, used to diplay in UIs
   */
  title: string;
  abstract: boolean;
  description: string;
  derivation?: string;
  baseDefinition?: URL;
}

export function isResource(obj: any): obj is Resource {
  return (
    typeof obj === "object" &&
    new Set(["resource", "complex-type", "primitive-type", "logical"]).has(
      obj.kind,
    )
  );
}

/**
 * Represents all the possible values that a field of a `Type` can have.
 */
export type Field = BaseField &
  (
    | { kind: "primitive"; value: Datatype.CODE; valueSet?: ValueSet }
    | PrimitiveCodeField 
    | { kind: "backbone-element"; fields: Record<string, Field> }
    | { kind: "element"; fields: Record<string, Field> }
    | { kind: "complex"; value: URL }
    | { kind: "reference"; value: string[] }
    | { kind: "alternatives"; value: Field[] }
  );

interface BaseField {
  url: URL;
  name: string;
  path: string;
  min: number;
  max: number | "*";
}
export type PrimitiveCodeField = BaseField & { kind: "primitive"; value: Datatype.CODE; valueSet?: ValueSet };

type ValueSet = { url: URL, strength: 'required' | 'preferred' | 'extensible' }

export function isField(obj: any): obj is Field {
  return (
    typeof obj === "object" &&
    new Set([
      "primitive",
      "backbone-element",
      "element",
      "complex",
      "reference",
      "alternative",
    ]).has(obj.kind)
  );
}

export function describeFieldType(field: Field): string {
  switch(field.kind) {
    case "primitive":
      return field.value;
    case "complex":
      return field.value.replace("http://hl7.org/fhir/StructureDefinition/", "")
    case "backbone-element":
      return "BackboneElement"
    case "element":
      return "Element"
    case "reference":
      return field.value.join("|")
    case "alternatives":
      return field.value.map(describeFieldType).join("|")
  }
}

/**
 * Represents all the possible type of data that the FHIR Mapping Language can
 * use and manage.
 */
export enum Datatype {
  BASE64BINARY = "base64Binary",
  BOOLEAN = "boolean",
  CANONICAL = "canonical",
  CODE = "code",
  DATE = "date",
  DATETIME = "dateTime",
  DECIMAL = "decimal",
  ID = "id",
  INTEGER = "integer",
  INSTANT = "instant",
  MARKDOWN = "markdown",
  OID = "oid",
  POSITIVEINT = "positiveInt",
  STRING = "string",
  TIME = "time",
  UNSIGNEDINT = "unsignedInt",
  URI = "uri",
  URL = "url",
  UUID = "uuid",
  XHTML = "xhtml",
}

export function isDatatype(obj: any): obj is Datatype {
  return Object.values(Datatype).includes(obj);
}
