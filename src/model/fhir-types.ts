/**
 * Represent a type corresponding to a `StructureDefinition` instance.
 * @note `type` is corresponding to `StructureDefinition['type']`
 */
export type Resource = (
  | { kind: "resource", name: string, fields: Record<string, Field> }
  | { kind: "complex-type", name: string, fields: Record<string, Field> }
  | { kind: "primitive-type", name: string, value: Datatype }
  | { kind: "logical", name: string, fields: Record<string, Field> }
) & {
  abstract: boolean;
}

export function isResource(obj: any): obj is Resource {
  return typeof obj === "object" &&
    new Set(["resource", "complex-type", "primitive-type", "logical"]).has(obj.kind);
}

/**
 * Represents all the possible values that a field of a `Type` can have.
 */
export type Field = (
  | { kind: "primitive", value: Datatype.CODE, options: string[] }
  | { kind: "primitive", value: Exclude<Datatype, Datatype.CODE> }
  | { kind: "backbone-element", fields: Record<string, Field> }
  | { kind: "element", fields: Record<string, Field> }
  | { kind: "complex", value: string }
  | { kind: "reference", value: string[] }
  | { kind: "alternatives", value: Field[] }
) & { name: string, path: string, min: number, max: number | "*" }

export function isField(obj: any): obj is Field {
  return typeof obj === "object" &&
    new Set(["primitive", "backbone-element", "element", "complex", "reference", "alternative"]).has(obj.kind);
}

export function isFieldSubtype(t1: Field, t2: Field): boolean {
  if (t2.kind === "alternatives") {
    return t2.value.every(t2Alt => isFieldSubtype(t1, t2Alt));
  }

  if (t1.kind === "alternatives") {
    return t1.value.some(t1Alt => isFieldSubtype(t1Alt, t2));
  }

  if (t1.kind !== t2.kind) return false;

  switch (t1.kind) {
    case "primitive":
      return isDatatypeSubtype(t1.value, (t2 as Extract<Field, { kind: "primitive" }>).value);
    case "complex":
    case "reference":
      return t1.value === (t2 as Extract<Field, { value: string }>).value;

    default:
      if (isElementLike(t1) && isElementLike(t2)) {
        const t1Fields = Object.keys(t1.fields);
        const t2Fields = Object.keys(t2.fields);
        return t2Fields.every(f => t1Fields.includes(f));
      }

      return false;
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

export function isDatatypeSubtype(d1: Datatype, d2: Datatype): boolean {
  if (d2 === Datatype.STRING) {
    return new Set([
      Datatype.BASE64BINARY,
      Datatype.CANONICAL,
      Datatype.CODE,
      Datatype.DATE,
      Datatype.DATETIME,
      Datatype.ID,
      Datatype.INSTANT,
      Datatype.MARKDOWN,
      Datatype.OID,
      Datatype.STRING,
      Datatype.TIME,
      Datatype.URI,
      Datatype.URL,
      Datatype.UUID,
      Datatype.XHTML,
    ]).has(d1)
  }
  if (d2 === Datatype.POSITIVEINT && d1 === Datatype.INTEGER) return true;
  return d1 === d2;
}

export type TypeDefMap = {
  get(s: string): Resource | undefined;
  getNonPrimitive(s: string): NonPrimitiveResource | undefined;
}

export function typeDefMapFromRecord(record: Record<string, Resource>): TypeDefMap {
  return {
    get(s) {
        return record[s];
    },
    getNonPrimitive(s) {
      if (record[s]?.kind !== "primitive-type") {
        return record[s];
      }
      return undefined;
    },
  }
}


