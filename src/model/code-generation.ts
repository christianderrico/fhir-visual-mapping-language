import type { Edge, Node } from "@xyflow/react";
import type { TransformName } from "src/components/nodes/TransformNode";

class FMLBase {
  base: string;
  father?: FMLNode;
  children: FMLNode[];

  public constructor(base:string, father?: FMLNode) {
    this.base = base
    this.father = father;
    this.children = [];
  }

  public addChildren(child: FMLNode) {
    this.children.push(child);
  }
}

class FMLNode extends FMLBase {
    id: string;
    alias: string;

    public constructor(node: Node){
        super("node")
        this.id = node.id
        this.alias = node.data.alias
    }
}

class FLMRule extends FMLBase {
    action: TransformName;
    parameters?: FMLNode[];
    condition?: string;

    public constructor(action: TransformName, parameters?: FMLNode[], condition?: string){
        super("rule");
        this.action = action
        this.parameters = parameters
        this.condition = condition
    }
}

function findNode(nodes: Node[], predicate: (id: Node) => Node) {
    return nodes.find(predicate)
}

export function createTree(nodes: Node[], edges: Edge[]){
    console.log(edges)
    console.log(nodes)

    edges.map(e => e.s)
    //edges.map(v => FMLNode(`${v.target} + ${v.id}`, 'test', ))
}