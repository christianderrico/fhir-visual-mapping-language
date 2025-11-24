import type { Resource } from "src-common/fhir-types";
import type { TypeMap } from "./type-map";
import type { URLOrDefinedType } from "./type-environment";
import { isUrl } from "src-common/strict-types";

export interface TypeNode {
  value: Resource;
  father?: TypeNode;
  children: TypeNode[];
}

export interface TypeTree {
  root: TypeNode;

  containsNode(url: URLOrDefinedType): boolean
  getNode(url: URLOrDefinedType): TypeNode | undefined;
  getAncestors(url: URLOrDefinedType): TypeNode[];
  getDescendants(url: URLOrDefinedType): TypeNode[];
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
  containsNode(url: URLOrDefinedType): boolean {
    return this.getNode(url) !== undefined
  }

  getAllNodes(): TypeNode[] {
    return [this.root, ...this._getDescendants(this.root)];
  }

  getNode(searchTerm: URLOrDefinedType): TypeNode | undefined {
    const allNodes = this.getAllNodes()

    return allNodes.find((node) =>
      isUrl(searchTerm)
        ? node.value.url === searchTerm
        : node.value.name === searchTerm,
    );
  }

  getAncestors(searchterm: URLOrDefinedType): TypeNode[] {
    return this._getAncestors(this.getNode(searchterm));
  }

  getDescendants(searchTerm: URLOrDefinedType): TypeNode[] {
    return this._getDescendants(this.getNode(searchTerm));
  }

  private _getAncestors(node: TypeNode | undefined): TypeNode[] {
    return !node || !node.father
      ? []
      : [node.father].concat(this._getAncestors(node.father)).reverse();
  }

  private _getDescendants(node: TypeNode | undefined): TypeNode[] {
    return !node || node.children.length === 0
      ? []
      : node.children.concat(
          node.children.flatMap((child) => this._getDescendants(child)),
        );
  }
}
