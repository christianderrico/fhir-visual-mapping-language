import type { TransformName } from "src/components/nodes/TransformNode";
import type { NodeType, Parameter, TransformParameter } from "./fml-types";
import { toFMLNodeType } from "./fml-utils";
import type { Node } from "@xyflow/react";

export class FMLBaseEntity {
  id: string;
  type: NodeType;
  father?: FMLBaseEntity;
  children: FMLBaseEntity[] = [];

  constructor(id: string, type: NodeType) {
    this.id = id;
    this.type = type;
  }

  addChild(child: FMLBaseEntity) {
    this.children.push(child);
  }
}

export class FMLNode extends FMLBaseEntity {
  resource: string;
  alias: string;
  url: URL;

  constructor(node: Node) {
    super(node.id, toFMLNodeType(node.type!));
    this.resource = node.data.type.name;
    this.alias = node.data.alias;
    this.url = node.data.type.url;
  }

  toString(): string {
    return `${this.alias}`;
  }
}

export class FMLRule extends FMLBaseEntity {
  constructor(
    id: string,
    type: NodeType,
    public readonly action: TransformName,
    public readonly rightParam: Parameter,
    public readonly leftParam: TransformParameter,
    public readonly isReference: boolean = false,
    public readonly parameters?: any[],
    public readonly condition?: string,
  ) {
    super(id, type);
  }

  private formatSource(): string {
    if (this.rightParam.type === "value") return `"${this.rightParam.value}"`;
    return `${this.rightParam.field ? `${this.rightParam.field}` : this.rightParam.alias}`;
  }

  private formatTarget(): string {
    return `${this.leftParam.alias}${this.leftParam.field ? `.${this.leftParam.field}` : ""}`;
  }

  toString(): string {
    const target = this.formatTarget();
    switch (this.action) {
      case "copy":
        return `${this.leftParam.alias} -> ${target} = ${this.formatSource()} "${this.id}";`;
      case "create":
        return `${this.leftParam.alias} -> ${target} = create("${(this.rightParam as TransformParameter).resource}") as ${(this.rightParam as TransformParameter).alias}`;
      default:
        return "";
    }
  }
}

export class FMLGraph {
  nodes = new Map<string, FMLNode>();
  rules = new Map<string, FMLRule>();

  addNode(node: FMLNode) {
    this.nodes.set(node.id, node);
  }

  addRule(rule: FMLRule) {
    this.rules.set(rule.id, rule);
  }

  getRoots(): FMLBaseEntity[] {
    const all = [...this.nodes.values(), ...this.rules.values()];
    return all.filter((n) => !n.father);
  }

  private filterRoot(
    predicate: (n: FMLBaseEntity) => boolean,
  ): FMLBaseEntity | undefined {
    return this.getRoots().find(predicate);
  }

  getSourceRoot(): FMLBaseEntity | undefined {
    return this.filterRoot((n) => n.type === "sourceNode");
  }

  getTargetRoot(): FMLBaseEntity | undefined {
    return this.filterRoot((n) => n.type === "targetNode");
  }
}
