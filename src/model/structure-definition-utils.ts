import { Datatype, type Field, type Resource } from "../model/fhir-types";
import { isElementLike } from "./type-environment-utils";

export class UndefinedSnapshotError extends Error {
  constructor(name: string) { 
    super(`Undefined "snapshot" for StructureDefinition/${name}`);
  }
}

export async function fetchStructureDefinition(uri: string): Promise<Resource | undefined> {
  const sd = await (await fetch(uri)).json()
  return parseStructureDefinition(sd);
}

export function parseStructureDefinition(structureDefinition: any): Resource | undefined {
  const {
    kind,
    name,
    type,
    abstract
  } = structureDefinition;

  // Skip profiles by comparing their name with the type (heuristic)
  if (type !== name)
    return undefined;

  const snapshot = structureDefinition.snapshot ?? structureDefinition.differential;

  // if (snapshot === undefined) {
  //   throw new UndefinedSnapshotError(name);
  // }

  if (kind === "primitive-type") {
    return {
      kind: "primitive-type",
      name: name,
      value: type as Datatype,
      abstract: false,
    }
  }

  const fields = {} as Record<string, Field>;

  for (const elem of snapshot.element) {
    const {path, min, max, type} = elem;

    const parts = path.split(".");
    if (parts.length === 1) continue;

    // e.g. Patient.contact.name becomes (given Patient is implicit)
    // prefix = ["contact"] 
    // last = "name"
    const prefix = parts.slice(1, -1);
    const last = parts.slice(-1)[0]!;

    let cursor = fields;
    for (const part of prefix) {
      const update = cursor[part];
      if (update === undefined || !isElementLike(update)) {
        throw new Error("Expected Element/BackboneElement at: " + part + " in " + path);
      }
      cursor = update.fields;
    }

    const field = parseType(type, {
      name: last,
      path,
      min,
      max: max === "*" ? "*" : parseInt(max),
    });
    if (field !== undefined) {
      cursor[last] = field;
    }
  }

  return {
    kind: kind!,
    fields,
    name,
    abstract,
  }
}

type Metadata = Pick<Field, "name" | "path" | "min" | "max">;

function parseType(type: any[] | undefined, metadata: Metadata): Field | undefined {
  if (type === undefined) {
    // console.debug(`Ignoring field: ${metadata.path} of ${metadata.name}`);
    return undefined;
  }

  if (type.length > 1) {
    return {
      kind: 'alternatives',
      value: type.map(t => parseOne(t, metadata)).filter((f): f is Field => Boolean(f)),
      ...metadata,
    }
  }

  return parseOne(type[0]!, metadata)
}

function parseOne(type: any, metadata: Metadata): Field | undefined {
  if (type.code === undefined) {
    throw new Error(`"type.code" must be defined at: ` + metadata.path);
  }
  if (type.code === "BackboneElement") {
      return {
        kind: 'backbone-element',
        fields: {},
        ...metadata
      }
  }
  if (type.code === "Element") {
      return {
        kind: 'element',
        fields: {},
        ...metadata
      }
  }
  if (type.code === "Reference") {
    return {
      kind: "reference",
      value: type.targetProfile!,
      ...metadata
    }
  }
  if (type.code.charAt(0).match(/[a-z]/)) {
    return {
      kind: "primitive",
      value: type.code as Datatype,
      ...metadata,
    }
  }
  if (type.code.charAt(0).match(/[A-Z]/)) {
    return {
      kind: "complex",
      value: type.code as Datatype,
      ...metadata,
    }
  }

  return undefined;
}
