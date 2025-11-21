import {
  SimpleTypeNode,
  SimpleTypeTree,
  TypeNode,
} from "../../src/model/type-tree";
import type { Resource } from "../../src-common/fhir-types";
import type { TypeMap } from "../../src/model/type-map";

import { test, describe, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { URL, url } from "../../src-common/strict-types";
import { partition } from "../../src/utils/functions";

describe("SimpleTypeTree", () => {
  const metadataFolder = ".\\src-generated\\metadata";

  const loadModules = (folder: string) =>
    readdirSync(folder)
      .filter((f) => f.endsWith(".json"))
      .map((file) => {
        const content = readFileSync(join(folder, file), "utf-8");
        return JSON.parse(content) as Resource;
      });

  const toEntry = (r: Resource): [string, Resource] => [r.url, r];
  const asNode = (value: Resource) => new SimpleTypeNode(value);

  const pickRandom = <T>(arr: T[]): T =>
    arr[Math.floor(Math.random() * arr.length)];

  const nodeName = (node: TypeNode) => node.value.name;

  const modules = loadModules(metadataFolder);
  const entries = modules.map(toEntry);

  const [resourceEntries, elementEntries] = partition(
    entries,
    ([, res]) => res.kind === "resource",
  );

  const resourceMap: TypeMap = Object.fromEntries(resourceEntries);
  const elementMap: TypeMap = Object.fromEntries(elementEntries);

  let resourceTree: SimpleTypeTree;
  let elementTree: SimpleTypeTree;

  let resourceNodes: TypeNode[];
  let elementNodes: TypeNode[];

  const patientURL: URL = url(
    "http://hl7.org/fhir/StructureDefinition/Patient",
  );
  const booleanURL: URL = url(
    "http://hl7.org/fhir/StructureDefinition/boolean",
  );

  beforeAll(() => {
    resourceTree = new SimpleTypeTree(resourceMap);
    elementTree = new SimpleTypeTree(elementMap);

    resourceNodes = Object.values(resourceMap).map(asNode);
    elementNodes = Object.values(elementMap).map(asNode);
  });

  describe("root handling", () => {
    test("identifies correct root", () => {
      expect(resourceTree.root.value.name).toBe("Resource");
      expect(elementTree.root.value.name).toBe("Element");
    });

    test("root has no father", () => {
      expect(resourceTree.root.father).toBeUndefined();
      expect(elementTree.root.father).toBeUndefined();
    });
  });

  describe("node listing", () => {
    test("returns all nodes", () => {
      const rNames = resourceNodes.map(nodeName).sort();
      const rTreeNames = resourceTree.getAllNodes().map(nodeName).sort();
      expect(rTreeNames).toEqual(rNames);

      const eNames = elementNodes.map(nodeName).sort();
      const eTreeNames = elementTree.getAllNodes().map(nodeName).sort();
      expect(eTreeNames).toEqual(eNames);
    });
  });

  describe("node retrieval", () => {
    test("can get node by URL", () => {
      const target = pickRandom(resourceNodes);
      expect(resourceTree.getNode(target.value.url)?.value).toEqual(
        target.value,
      );

      const targetElement = pickRandom(elementNodes);
      expect(elementTree.getNode(targetElement.value.url)?.value).toEqual(
        targetElement.value,
      );
    });

    test("can get node by name", () => {
      const target = pickRandom(resourceNodes);
      expect(resourceTree.getNode(target.value.name)?.value).toEqual(
        target.value,
      );

      const targetElement = pickRandom(elementNodes);
      expect(elementTree.getNode(targetElement.value.name)?.value).toEqual(
        targetElement.value,
      );
    });
  });

  describe("tree relationships", () => {
    test("leaves have no children", () => {
      expect(resourceTree.getNode(patientURL)?.children).toHaveLength(0);
      expect(elementTree.getNode(booleanURL)?.children).toHaveLength(0);
    });

    test("computes ancestors", () => {
      expect(resourceTree.getAncestors("Patient").map(nodeName)).toEqual([
        "Resource",
        "DomainResource",
      ]);

      expect(elementTree.getAncestors("Dosage").map(nodeName)).toEqual([
        "Element",
        "BackboneElement",
      ]);
    });

    test("computes descendants", () => {
      const excluded = [
        "Parameters",
        "Bundle",
        "Binary",
        "Resource",
        "DomainResource",
      ];

      const allResources = resourceEntries
        .map(([, res]) => res.name)
        .filter((name) => !excluded.includes(name));

      const descendants = resourceTree
        .getDescendants("DomainResource")
        .map(nodeName);

      expect(descendants.sort()).toEqual(allResources.sort());

      const uriDescendants = elementTree.getDescendants("uri").map(nodeName);
      expect(uriDescendants).toEqual(["canonical", "oid", "url", "uuid"]);
    });
  });
});
