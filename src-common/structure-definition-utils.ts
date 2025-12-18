import { Datatype, type Field, type Resource } from "./fhir-types";
import { isElementLike } from "../src/model/type-environment-utils";
import { url, type URL } from "./strict-types";
import type {
  ValueSet,
  ValueSetEntry,
} from "./valueset-types";

export class UndefinedSnapshotError extends Error {
  constructor(name: string) {
    super(`Undefined "snapshot" for StructureDefinition/${name}`);
  }
}

export async function fetchStructureDefinition(
  uri: string,
): Promise<Resource | undefined> {
  const sd = await (await fetch(uri)).json();
  return parseStructureDefinition(sd);
}

function isCodeField(
  field: Field | undefined,
): field is Field & { kind: "primitive"; value: Datatype.CODE } {
  return !!field && field.kind === "primitive" && field.value === "code";
}

export function getValuesetsUrl(resource: Resource | undefined): URL[] {
  if (!resource || resource.kind === "primitive-type") return [];
  else
    return Object.values(resource.fields)
      .filter(isCodeField)
      .map((f) => f.valueSet?.url)
      .filter((url): url is URL => url !== undefined && url !== null);
}

export function getCodeSystem(vs: any): URL[] {
  const getSystems: (obj?: any) => Set<string> = (obj) =>
    new Set(obj?.map((i: any) => i.system));
  const toExclude: Set<string> = getSystems(vs.compose?.exclude);
  const toInclude: Set<string> = getSystems(vs.compose?.include);
  return (
    [...toInclude.values()]
      .filter((e) => !toExclude.has(e))
      .filter((system): system is URL => system !== undefined) ?? []
  );
}

function _getValuesetsUrl(binding: {
  strength: string;
  valueSet: URL;
}): URL | undefined {
  switch (binding.strength) {
    case "required":
    case "extensible":
    case "preferred":
      return url(binding.valueSet.split("|")[0]);
  }
}

export function parseValuesetMap(codes: Record<URL, any>): ValueSet[] {
  return Object.entries(codes)
    .filter(([_, sd]) => sd.resourceType === "ValueSet")
    .map(([_, _structuredDefinition]) => {
      const { id, url, compose } = _structuredDefinition;
      const include: ValueSetEntry[] = compose.include.map(
        (v: ValueSetEntry) => {
          return {
            system: v.system,
            concept:
              v.concept ?? codes[v.system]?.concept,
          };
        },
      );
      return {
        id,
        url,
        include,
      };
    });
}

export function parseStructureDefinition(
  structureDefinition: any,
): Resource | undefined {
  const { kind, name, type, abstract, url, title, derivation, baseDefinition, description } =
    structureDefinition;

  // Skip profiles by comparing their name with the type (heuristic)
  if (!name.includes(type) && !type.includes(name)) return undefined;
  
  const snapshot =
    structureDefinition.snapshot ?? structureDefinition.differential;

  if (kind === "primitive-type") {
    return {
      url,
      kind: "primitive-type",
      description,
      title,
      name,
      derivation,
      baseDefinition,
      value: type as Datatype,
      abstract: false,
    };
  }

  const fields = {} as Record<string, Field>;

  for (const elem of snapshot.element) {
    const { path, min, max, type, binding } = elem;

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
        throw new Error(
          "Expected Element/BackboneElement at: " + part + " in " + path,
        );
      }
      cursor = update.fields;
    }

    const field = parseType(type, {
      name: last,
      path,
      min,
      max: max === "*" ? "*" : parseInt(max),
    });

    if (binding && isCodeField(field))
      field.valueSet = {
        url: _getValuesetsUrl(binding),
        strength: binding.strength,
      };

    if (field !== undefined) {
      cursor[last] = field;
    }
  }

  return {
    url,
    title,
    kind: kind!,
    fields,
    name,
    description,
    abstract,
    derivation,
    baseDefinition,
  };
}

type Metadata = Pick<Field, "name" | "path" | "min" | "max">;

function parseType(
  type: any[] | undefined,
  metadata: Metadata,
): Field | undefined {
  if (type === undefined) {
    // console.debug(`Ignoring field: ${metadata.path} of ${metadata.name}`);
    return undefined;
  }

  if (type.length > 1) {
    return {
      kind: "alternatives",
      value: type
        .map((t) => parseOne(t, metadata))
        .filter((f): f is Field => Boolean(f)),
      ...metadata,
    };
  }

  return parseOne(type[0]!, metadata);
}

function parseOne(type: any, metadata: Metadata): Field | undefined {
  if (type.code === undefined) {
    throw new Error(`"type.code" must be defined at: ` + metadata.path);
  }
  if (type.code === "BackboneElement") {
    return {
      kind: "backbone-element",
      fields: {},
      ...metadata,
    };
  }
  if (type.code === "Element") {
    return {
      kind: "element",
      fields: {},
      ...metadata,
    };
  }
  if (type.code === "Reference") {
    return {
      kind: "reference",
      value: type.targetProfile!,
      ...metadata,
    };
  }
  if (type.code.charAt(0).match(/[a-z]/)) {
    return {
      kind: "primitive",
      value: type.code as Datatype,
      ...metadata,
    } as any;
  }
  if (type.code.charAt(0).match(/[A-Z]/)) {
    return {
      kind: "complex",
      value: type.code as any,
      ...metadata,
    };
  }

  return undefined;
}
