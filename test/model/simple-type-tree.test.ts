import { SimpleTypeNode, SimpleTypeTree } from "../../src/model/type-tree";
import type { Resource } from "../../src-common/fhir-types";
import type { TypeMap } from "../../src/model/type-map";
import { TypeNode } from "../../src/model/type-tree";
import { test, describe, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { URL, url } from "../../src-common/strict-types";

describe("SimpleTypeTree", () => {
  const folder = "C:\\Users\\chris\\visual-fml\\src-generated\\metadata";
  const modules = readdirSync(folder)
    .filter((f) => f.endsWith(".json"))
    .map((fName) => {
      const fullPath = join(folder, fName);
      const content = readFileSync(fullPath, "utf-8");
      return JSON.parse(content);
    });

  const typeMap: TypeMap = Object.fromEntries(
    Object.entries(modules).map(([_, obj]) => {
      return [(obj as Resource).url, obj] as [string, Resource];
    }),
  );

  const node2Name: (node: TypeNode) => string = (node) => node.value.name;

  let tree: SimpleTypeTree;
  let nodes: Record<string, any>;
  let allNodes: TypeNode[];
  let patientURL: URL = url("http://hl7.org/fhir/StructureDefinition/Patient");
  let domainResourceURL: URL = url(
    "http://hl7.org/fhir/StructureDefinition/DomainResource",
  );

  beforeAll(() => {
    tree = new SimpleTypeTree(typeMap);
    allNodes = Object.values(typeMap).map(
      (resource) => new SimpleTypeNode(resource),
    );
    nodes = Object.fromEntries(allNodes.map((n) => [n.value.url, n]));
  });

  test("should identify the root node", () => {
    expect(tree.root.value.name).toBe("Resource");
  });

  test("should return all nodes", () => {
    expect(tree.getAllNodes().map(node2Name).sort()).toEqual(
      allNodes.map(node2Name).sort(),
    );
  });

  test("should have root without father", () => {
    expect(tree.root.father).toBeUndefined();
  });

  test("should have leaves without children", () => {
    expect(tree.getNodeByURL(patientURL)?.children.length).toBe(0);
  });

  test("should return node by URL", () => {
    const random_id = Math.floor(Math.random() * allNodes.length);
    const node = allNodes[random_id];
    expect(tree.getNodeByURL(node.value.url)?.value).toEqual(node.value);
  });

  test("should return ancestors of a given node", () => {
    const ancestors = ["Resource", "DomainResource"];
    const node = tree.getNodeByURL(patientURL)!;
    expect(tree.getAncestors(node).map(node2Name)).toEqual(ancestors);
  });

  test("should return descendants of a given node", () => {
    const toExclude = [
      "Parameters",
      "Bundle",
      "Binary",
      "Resource",
      "DomainResource",
    ];
    const resources = modules
      .map((res) => res.name)
      .filter((res) => !toExclude.includes(res));
    const node = tree.getNodeByURL(domainResourceURL);
    const descendants = tree
      .getDescendants(tree.getNodeByURL(domainResourceURL)!)
      .map(node2Name);

    expect(resources.sort()).toEqual(descendants.sort());
  });
});
