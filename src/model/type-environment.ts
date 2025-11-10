import type { Field, Resource } from "./fhir-types";
import type { TypeMap } from "./type-map";

export interface TypeEnvironment {
  hasType(typeName: string): boolean;
  getType(typeName: string): Resource | undefined;
  getTypeFields(typeName: string): Record<string, Field> | undefined;
  resolvePathType(typeName: string, pathParts: string[]): Field | undefined;
  getImplementations(typeName: string): Resource[];
}

export class SimpleTypeEnvironment implements TypeEnvironment {
  constructor(private typeMap: TypeMap) {}

  hasType(typeName: string): boolean {
    return this.typeMap[typeName] !== undefined;
  }

  getType(typeName: string): Resource | undefined {
    return this.typeMap[typeName];
  }

  getTypeFields(typeName: string): Record<string, Field> | undefined {
    const type = this.getType(typeName);
    if (type !== undefined && "fields" in type!) {
      return type.fields;
    }
    return undefined;
  }

  resolvePathType(typeName: string, pathParts: string[]): Field | undefined {
    const [head, ...tail] = pathParts as [string, ...string[]];
    const type = this.getType(typeName);

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

  getImplementations(typeName: string): Resource[] {
    // TODO: hold these data somewhere, likely in constructor
    // throw new Error("not implemented yet");
    return ["Bundle", "Identifier", "Patient"].map((name) => ({
      kind: "resource",
      name,
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
