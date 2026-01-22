export type TransformParameter = {
  type: "transform";
  id: string;
  resource: string;
  alias: string;
  field?: string;
};

export type ValueParameter = {
  type: "value";
  value: string;
};

export type Parameter = TransformParameter | ValueParameter;

export type NodeType = "sourceNode" | "targetNode" | "groupNode" | "fakeNode" | "sourceTargetNode";