import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useCallback, useMemo, type FC } from "react";
import classes from "./Node.module.css";
import clsx from "clsx";
import { List, ListItem, Text } from "@mantine/core";
import { Datatype } from "src-common/fhir-types";
import { useFlow } from "src/providers/FlowProvider";
import { range } from "src/utils/functions";

/**
 * Official transform values provided by `ValueSet/map-transform`.
 */
export type TransformName =
  | "create"
  | "copy"
  | "truncate"
  | "escape"
  | "cast"
  | "append"
  | "translate"
  | "reference"
  | "dateOp"
  | "uuid"
  | "pointer"
  | "evaluate"
  | "cc"
  | "c"
  | "qty"
  | "id"
  | "cp";

export type Argument =
  | { datatype: Datatype.STRING; value: string }
  | { datatype: Datatype.INTEGER; value: number }
  | {
      datatype: Exclude<Exclude<Datatype, Datatype.STRING>, Datatype.INTEGER>;
      value: string;
    };

type TransformNodeProps<P extends string = string> = NodeProps<
  Node<{ transformName: P; args: Argument[] }>
>;

const ConstNode: FC<TransformNodeProps<"const">> = (props) => {
  const { args } = props.data;

  const value = useMemo(() => {
    if (args?.length !== 1) {
      console.error("Wrong argument number in Const node");
    }
    return args![0];
  }, [args]);

  const Argument: FC<Argument> = useCallback(({ value, datatype }) => {
    switch (datatype) {
      case Datatype.INTEGER:
      case Datatype.UNSIGNEDINT:
      case Datatype.POSITIVEINT:
      case Datatype.DECIMAL:
      case Datatype.BOOLEAN:
        return (
          <Text fz="xs" c="blue">
            {value}
          </Text>
        );
      default:
        return (
          <Text fz="xs" c="green">
            "{value}"
          </Text>
        );
    }
  }, []);

  return (
    <div
      className={clsx(
        classes.transformNode,
        props.selected && classes.selected,
      )}
    >
      <Argument {...value} />
      <Handle
        type="source"
        position={Position.Right}
        className={classes.handle}
      />
    </div>
  );
};

const AppendEvaluateNode: FC<TransformNodeProps<"append" | "evaluate">> = (props) => {
  const { id } = props;
  const { getActiveNodesAndEdges } = useFlow();

  const { edges } = getActiveNodesAndEdges();

  const sourceCount = edges.filter((x) => x.target === id).length;

  return (
    <div
      className={clsx(
        classes.transformNode,
        classes.appendNode,
        props.selected && classes.selected,
      )}
    >
      <Text fz="xs">{props.data.transformName}</Text>
      <div className={classes.handleList}>
        {range(sourceCount + 1).map((i) => (
          <div key={i} className={classes.handleContainer}>
            <Handle
              type="target"
              position={Position.Left}
              className={classes.handle}
              id={i.toString()}
            />
          </div>
        ))}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className={classes.handle}
      />
    </div>
  );
};

export const TransformNode: FC<TransformNodeProps> = (props) => {
  const { transformName, args } = props.data;

  if (transformName === "const") return <ConstNode {...(props as any)} />;
  if (transformName === "append" || transformName === "evaluate") return <AppendEvaluateNode {...(props as any)} />;

  return (
    <div
      className={clsx(
        classes.transformNode,
        props.selected && classes.selected,
      )}
    >
      <Text fz="xs">{transformName}</Text>
      {args && (
        <List>
          {args.map((arg) => (
            <ListItem fz="xs">{arg.value}</ListItem>
          ))}
        </List>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className={classes.handle}
      />
    </div>
  );
};
