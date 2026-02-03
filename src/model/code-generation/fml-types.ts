import _ from "lodash";

export type TransformParameter = {
  type: "transform";
  id: string;
  resource: string;
  alias: string;
  originType?: string;
  field?: string;
};

export type ValueParameter = {
  type: "value";
  value: string | number;
};

export type Parameter = TransformParameter | ValueParameter;

export type NodeType =
  | "sourceNode"
  | "targetNode"
  | "groupNode"
  | "fakeNode"
  | "sourceTargetNode";

export function parameterToString(param: Parameter): string {
  switch (param.type) {
    case "transform":
      return param.field ? param.field + "_" + param.alias.split("_")[1] : param.alias
    case "value":
      return `${_.isString(param.value) ? "\"" + param.value + "\"" : param.value}`;
  }
}
