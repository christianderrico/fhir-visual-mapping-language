import type { TransformName } from "src/components/nodes/TransformNode";
import {
  parameterToString,
  type NodeType,
  type Parameter,
  type TransformParameter,
} from "./fml-types";
import { toFMLNodeType } from "./fml-utils";
import type { Node } from "@xyflow/react";
import _ from "lodash";
import type { Resource } from "src-common/fhir-types";
import { type URL } from "src-common/strict-types";

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
    this.resource = (node.data.type as Resource | undefined)?.name ?? "";
    this.alias = node.data.alias as string;
    this.url = (node.data.type as Resource)?.url;
  }

  toString(): string {
    return `${this.alias}`;
  }
}

export class FMLGroupNode extends FMLNode {
  sources: TransformParameter[];
  targets: TransformParameter[];
  level: number;
  constructor(node: Node) {
    super(node);
    this.sources = [];
    this.targets = [];
    this.level = 0;
  }

  addSource(source: TransformParameter) {
    this.sources.push(source);
  }

  addTarget(target: TransformParameter) {
    this.targets.push(target);
  }

  setLevel(level: number) {
    this.level = level;
  }

  toString(): string {
    return (
      `${this.alias}(${this.sources.map((v) => (v.field ? v.field + "_" + v.alias.split("_")[1] : v.alias)).join(", ")},` +
      ` ${this.targets.map((t) => (t.field ? t.field + "_" + t.alias.split("_")[1] : t.alias)).join(", ")}) "${this.alias}";`
    );
  }
}

export class FMLRule extends FMLBaseEntity {
  constructor(
    id: string,
    type: NodeType,
    public readonly action: TransformName | undefined,
    public readonly leftParam: TransformParameter,
    public rightParams: Parameter[] = [],
    public readonly isReference: boolean = false,
    public readonly parameters?: any[],
    public readonly condition?: string,
  ) {
    super(id, type);
  }

  private formatSource(param: Parameter): string {
    if (param.type === "value") return parameterToString(param);
    return `${param.field ? `${param.field}` : param.alias}`;
  }

  private formatTarget(): string {
    return `${this.leftParam.alias}${this.leftParam.field ? `.${this.leftParam.field.replace("[x]", "")}` : ""}`;
  }

  public addRightParam(param: Parameter) {
    if (this.rightParams.length === 0) this.rightParams.push(param);
  }

  toString(): string {
    const target = this.formatTarget();
    switch (this.action) {
      case "copy":
        return `${this.leftParam.alias} -> ${target} = ${this.formatSource(this.rightParams[0])} "copy";`;
      case "reference":
        return `${this.leftParam.alias} -> ${target} = reference(${this.formatSource(this.rightParams[0])}) "reference";`;
      case "create":
        return `${this.leftParam.alias} -> ${target} = create("${(this.rightParams[0] as TransformParameter).resource}") as ${(this.rightParams[0] as TransformParameter).alias} then {`;
      case "translate":
        return `${this.leftParam.alias} -> ${target} = translate(${this.rightParams.map(parameterToString).join(",")}) "translate";`;
      case "append":
        return `${this.leftParam.alias} -> ${target} = append(${this.rightParams.map(parameterToString).join(",")}) "append";`;
      case "evaluate":
        return `${this.leftParam.alias} -> ${target} = evaluate(${this.rightParams.map(parameterToString).join(",")}) "evaluate";`;
      case "uuid":
        return `${this.leftParam.alias} -> ${target} = ${(this.rightParams[0] as TransformParameter).alias}`;
      default:
        return "";
    }
  }
}
