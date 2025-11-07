import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { FC } from "react";
import classes from './Node.module.css';
import clsx from "clsx";
import { List, ListItem, Text } from "@mantine/core";

export const TransformNode: FC<NodeProps<Node<{ transformName: string, args: string[] | undefined }>>> = (props) => {
  const { transformName, args } = props.data;
  return (
    <div className={clsx(classes.transformNode, props.selected && classes.selected)}>
      <Text fz="xs">{transformName}</Text>
      {args && <List>
          {args.map(arg => <ListItem fz="xs">{arg}</ListItem>)}
      </List>}
      <Handle type="target" position={Position.Left} className={classes.handle} />
      <Handle type="source" position={Position.Right} className={classes.handle} />
    </div>
  )
}
