import type { TransformName } from "src/components/nodes/TransformNode";
import type { NodeType, Parameter, TransformParameter } from "./fml-types";
import {
  isFakeNode,
  isNode,
  isRule,
  isTransformParam,
  toFMLNodeType,
} from "./fml-utils";
import type { Node } from "@xyflow/react";
import _ from "lodash";

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
    this.resource = node.data.type?.name;
    this.alias = node.data.alias;
    this.url = node.data.type?.url;
  }

  toString(): string {
    return `${this.alias}`;
  }
}

export class FMLGroupNode extends FMLNode {
  sources: FMLBaseEntity[];
  targets: FMLBaseEntity[];
  level: number;
  constructor(node: Node) {
    super(node);
    this.sources = [];
    this.targets = [];
    this.level = 0;
  }

  addSource(source: FMLBaseEntity) {
    this.sources.push(source);
  }

  addTarget(target: FMLBaseEntity) {
    this.targets.push(target);
  }

  setLevel(level: number) {
    this.level = level;
  }

  private getName(node: FMLBaseEntity, alias: string = ""): string[] {
    const { name, prev_alias } = this.resolveNodeName(node, alias);
    return node.father
      ? isFakeNode(node.father)
        ? []
        : [name, ...this.getName(node.father, prev_alias)]
      : [name];
  }

  private resolveNodeName(
    node: FMLBaseEntity,
    previous_alias: string = "",
  ): { name: string; prev_alias: string } {
    if (isNode(node)) {
      return { name: node.alias, prev_alias: node.alias };
    }

    if (!isRule(node)) {
      return { name: "", prev_alias: "" };
    }

    if (
      node.type === "targetNode" ||
      (node.type === "groupNode" && node.father?.type === "targetNode")
    ) {
      const { alias, field, id } = node.leftParam;

      return {
        name:
          field != null
            ? `${alias}.${field}.${previous_alias != "" ? previous_alias : field + "_" + id}`
            : `${alias}.${alias}.${alias}`,
        prev_alias: alias,
      };
    }

    if (
      node.type === "sourceNode" ||
      (node.type === "groupNode" && node.father?.type === "sourceNode")
    ) {
      const { alias, field, id } = node.rightParam as TransformParameter;

      return {
        name: field
          ? `${alias}.${field}.${previous_alias != "" ? previous_alias : field + "_" + id}`
          : alias,
        prev_alias: alias,
      };
    }

    return { name: "", prev_alias: "" };
  }

  private mapNode2String(node: FMLBaseEntity) {
    if (isRule(node)) {
      if (node.father?.type === "sourceNode")
        if (isTransformParam(node.rightParam))
          return node.rightParam.field
            ? node.rightParam.field + `_${node.rightParam.id}`
            : node.rightParam.alias;

      if (node.father?.type === "targetNode")
        return node.leftParam.field
          ? node.leftParam.field + `_${node.leftParam.id}`
          : node.leftParam.alias;
    }
  }

  toString(): string {
    const indent = "  ";

    const uniqueReversed = (arr: string[]) => [...new Set(arr)].reverse();

    const splitName = (s: string) => s.split(".");

    const formatAlias = (parts: string[]) => {
      return `${_.uniq(parts.slice(0, 2)).join(".")} as ${parts[2]}`;
    };

    const formatThenBlock = (s: string, level: number) => {
      if (!s.includes(".")) return null;

      const parts = splitName(s);
      return `${indent.repeat(level)}${formatAlias(parts)} then {\n`;
    };

    const formatThenLine = (s: string, level: number, isLast: boolean) => {
      if (!s.includes(".")) return null;

      const parts = splitName(s);
      return (
        indent.repeat(level) +
        formatAlias(parts) +
        (isLast ? " then " : " then {\n")
      );
    };

    const sources = uniqueReversed(
      this.sources.flatMap((v) => this.getName(v)),
    );
    const targets = uniqueReversed(
      this.targets.flatMap((v) => this.getName(v)),
    );

    let result = "";
    let openBlocks = 0;

    sources.forEach((s, i) => {
      const line = formatThenBlock(s, this.level + i);
      if (line) {
        result += line;
        openBlocks++;
      }
    });

    const sourcesOpenBlock = openBlocks;

    let counter = 0;
    targets.forEach((s, i) => {
      const line = formatThenLine(
        s,
        this.level + sourcesOpenBlock + counter,
        i === targets.length - 1,
      );
      if (line) {
        result += line;
        counter += 1;
        if (i !== targets.length - 1) openBlocks++;
      }
    });

    const id = this.id.replace(this.alias, "");
    const mappedSource = this.sources.map(this.mapNode2String);
    const mappedTarget = this.targets.map(this.mapNode2String);

    result +=
      `${id}(${mappedSource.join(", ")}, ${mappedTarget.join(", ")}) "${this.id}";` +
      (openBlocks > 0 ? "\n" : "");

    for (let i = openBlocks; i > 0; i--) {
      result += indent.repeat(this.level + i - 1) + "};" + (i == 1 ? "" : "\n");
    }

    return result;
  }
}

export class FMLRule extends FMLBaseEntity {
  constructor(
    id: string,
    type: NodeType,
    public readonly action: TransformName | undefined,
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
  ): FMLBaseEntity[] {
    return this.getRoots().filter(predicate);
  }

  getSourceRoot(): FMLBaseEntity[] {
    return this.filterRoot((n) => n.type === "sourceNode");
  }

  getTargetRoot(): FMLBaseEntity[] {
    return this.filterRoot((n) => n.type === "targetNode");
  }
}
