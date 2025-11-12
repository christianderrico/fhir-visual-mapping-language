import type { Field, Resource } from "./fhir-types";
import { type URL, url as makeUrl } from "./strict-types";
import type { TypeMap } from "./type-map";

export interface TypeEnvironment {
  hasType(url: URL): boolean;
  getType(url: URL): Resource | undefined;
  getTypeFields(url: URL): Record<string, Field> | undefined;
  resolvePathType(url: URL, pathParts: string[]): Field | undefined;
  getImplementations(url: URL): Resource[];
}

export class SimpleTypeEnvironment implements TypeEnvironment {
  constructor(private typeMap: TypeMap) {}

  hasType(url: URL): boolean {
    return this.typeMap[url] !== undefined;
  }

  getType(url: URL): Resource | undefined {
    return this.typeMap[url];
  }

  getTypeFields(url: URL): Record<string, Field> | undefined {
    const type = this.getType(url);
    if (type !== undefined && "fields" in type!) {
      return type.fields;
    }
    return undefined;
  }

  resolvePathType(url: URL, pathParts: string[]): Field | undefined {
    const [head, ...tail] = pathParts as [string, ...string[]];
    const type = this.getType(url);

    if (
      type === undefined ||
      pathParts.length === 0 ||
      !("fields" in type) ||
      type.fields[head] === undefined
    ) {
      return undefined;
    }

    return this.resolveTail(type.fields[head], tail);
  }

  getImplementations(url: URL): Resource[] {
    // TODO: hold these data somewhere, likely in constructor
    // throw new Error("not implemented yet");
    return ["Bundle", "Identifier", "Patient"].map((name) => ({
      url: makeUrl(`https://hl7.org/fhir/${name}`),
      kind: "resource",
      name,
      title: name,
      fields: {},
      abstract: false,
    }));
  }

  private resolveTail(field: Field, pathParts: string[]): Field | undefined {
    // base case
    if (pathParts.length === 0) return field;
    // recurse
    const [head, ...tail] = pathParts as [string, ...string[]];

    if (field.kind === "primitive") return undefined;

    // TODO: decide how to handle 'alternative' and 'reference'
    const next = (() => {
      switch (field.kind) {
        case "element":
        case "backbone-element":
          return field.fields[head];
        case "complex":
          return this.resolvePathType(field.value, [head]);
        default:
          return undefined;
      }
    })();

    if (!next) return undefined;

    return this.resolveTail(next, tail);
  }
}
