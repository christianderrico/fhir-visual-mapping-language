import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useCallback, useMemo, type FC } from "react";
import classes from "./Node.module.css";
import clsx from "clsx";
import { List, ListItem, Text } from "@mantine/core";
import { Datatype } from "src-common/fhir-types";

/**
 * Official transform values provided by `ValueSet/map-transform`.
 */
type TransformName =
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

type Argument =
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
  const { transformName, args } = props.data;

  const value = useMemo(() => {
    if (args?.length !== 1) {
      console.error("Wrong argument number in Const node");
    }
    return args![0];
  }, [args]);

  const Argument: FC<{ value: Argument }> = useCallback(({ value }) => {
    switch (value.datatype) {
      case Datatype.INTEGER:
      case Datatype.UNSIGNEDINT:
      case Datatype.POSITIVEINT:
        return (
          <Text fz="xs" c="blue">
            {value.value}
          </Text>
        );
      // case Datatype.STRING:
      default:
        return (
          <Text fz="xs" c="green">
            "{value.value}"
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
      <Argument value={value} />
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
        type="target"
        position={Position.Left}
        className={classes.handle}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={classes.handle}
      />
    </div>
  );
};
