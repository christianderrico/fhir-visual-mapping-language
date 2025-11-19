import type { Resource } from "src-common/fhir-types";
import type { TypeMap } from "./type-map";
import type { URL } from "src-common/strict-types";

export interface TypeNode {
  value: Resource;
  father?: TypeNode;
  children: TypeNode[];
}

export interface TypeTree {
  root: TypeNode;

  getNodeByURL(url: URL): TypeNode | undefined;
  getAncestors(node: TypeNode): TypeNode[];
  getDescendants(node: TypeNode): TypeNode[];
  getAllNodes(): TypeNode[];
}

export class SimpleTypeNode implements TypeNode {
  value: Resource;
  father?: TypeNode;
  children: TypeNode[];

  constructor(resource: Resource) {
    this.value = resource;
    this.children = [];
  }
}

export class SimpleTypeTree implements TypeTree {
  root: TypeNode;

  constructor(tMap: TypeMap) {
    const nodes = Object.values(tMap).map((res) => new SimpleTypeNode(res));
    nodes.forEach((node) => {
      node.father = nodes.find(
        (n) => node.value.baseDefinition === n.value.url,
      );
      node.father?.children.push(node);
    });
    this.root = nodes.find((n) => n.father === undefined)!;
  }

  getAllNodes(): TypeNode[] {
    return [this.root, ...this.getDescendants(this.root)];
  }

  getNodeByURL(url: URL): TypeNode | undefined {
    return this.root.value.url === url
      ? this.root
      : this.getAllNodes().find((n) => n.value.url === url);
  }

  getAncestors(node: TypeNode): TypeNode[] {
    return !node.father
      ? []
      : [node.father].concat(this.getAncestors(node.father)).reverse();
  }

  getDescendants(node: TypeNode): TypeNode[] {
    return node.children.length === 0
      ? []
      : node.children.concat(
          node.children.flatMap((child) => this.getDescendants(child)),
        );
  }
}
