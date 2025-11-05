import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { FC } from "react";
import classes from './Node.module.css';
import clsx from "clsx";

export const TransformNode: FC<NodeProps<Node<{ transformName: string }>>> = (props) => {
  const { transformName } = props.data;
  return (
    <div className={clsx(classes.transformNode, props.selected && classes.selected)}>
      {transformName}
      <Handle type="target" position={Position.Left} className={classes.handle} />
      <Handle type="source" position={Position.Right} className={classes.handle} />
    </div>
  )
}