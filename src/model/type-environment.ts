import type { DefinedType, Field, Resource } from "src-common/fhir-types";
import { type URL } from "src-common/strict-types";
import type { TypeMap } from "./type-map";
import { SimpleTypeTree, type TypeTree } from "./type-tree";
import { partition } from "../utils/functions";
import type { ValueSet, ValueSetMap } from "src-common/valueset-types";

export type URLOrDefinedType = URL | DefinedType;

export interface TypeEnvironment {
  hasType(url: URLOrDefinedType): boolean;
  getType(url: URLOrDefinedType): Resource | undefined;
  getTypeFields(url: URLOrDefinedType): Record<string, Field> | undefined;
  resolvePathType(
    url: URLOrDefinedType,
    pathParts: string[],
  ): Field | undefined;
  getImplementations(url: URLOrDefinedType): Resource[];
  getValueSet(url: URL): ValueSet | undefined;
  getOptions(url: URL): Record<URL, string[]>;
}

export class SimpleTypeEnvironment implements TypeEnvironment {
  private resourceTypeTree: TypeTree;
  private elementTypeTree: TypeTree;

  constructor(
    private typeMap: TypeMap,
    private valueSets: ValueSetMap,
  ) {
    const entries = Object.entries(typeMap);

    console.log(valueSets);

    const [resourceEntries, elementEntries] = partition(
      entries,
      ([_, t]) => t.kind === "resource",
    );

    this.resourceTypeTree = new SimpleTypeTree(
      Object.fromEntries(resourceEntries),
    );
    this.elementTypeTree = new SimpleTypeTree(
      Object.fromEntries(elementEntries),
    );
  }
  getOptions(url: URL): Record<URL, string[]> {
    return Object.fromEntries(
      this.getValueSet(url)?.include.map(
        (v) => [v.system, v.concept.map((c) => c.code)] as const,
      ) ?? [],
    );
  }

  getValueSet(url: URL): ValueSet | undefined {
    return this.valueSets[url];
  }

  hasType(url: URLOrDefinedType): boolean {
    return this.typeMap[url as URL] !== undefined;
  }

  getType(url: URLOrDefinedType): Resource | undefined {
    return this.typeMap[url as URL];
  }

  getTypeFields(url: URLOrDefinedType): Record<string, Field> | undefined {
    const type = this.getType(url);
    if (type !== undefined && "fields" in type!) {
      return type.fields;
    }
    return undefined;
  }

  resolvePathType(
    url: URLOrDefinedType,
    pathParts: string[],
  ): Field | undefined {
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

  getImplementations(url: URLOrDefinedType): Resource[] {
    return (
      this.resourceTypeTree.containsNode(url)
        ? this.resourceTypeTree
        : this.elementTypeTree
    )
      .getDescendants(url)
      .map((tNode) => tNode.value);
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
