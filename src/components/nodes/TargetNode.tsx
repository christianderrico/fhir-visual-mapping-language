import { Text, Group, Stack, Tooltip, Button } from "@mantine/core";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useCallback, type FC } from "react";
import classes from "./Node.module.css";
import clsx from "clsx";
import { IconPackage } from "@tabler/icons-react";
import type { Field, Resource } from "src-common/fhir-types";
import { useTypeEnvironment } from "../../hooks/useTypeEnvironment";
import { getNonPrimitiveType } from "../../model/type-environment-utils";
import { asVariableName, extractNumberFromString } from "src/utils/functions";

type TargetNodeProps = NodeProps<
  Node<{
    type: Resource | Field;
    connections: Map<string, string[]>;
    expand: boolean;
    onToggleNodeExpand: (isExpanded: boolean, id?: string) => void
    inner?: never;
  }>
>;

export const TargetNode: FC<TargetNodeProps> = (props) => {
  const typeEnv = useTypeEnvironment();
  const { type: typeDef, connections, expand, onToggleNodeExpand } = props.data;
  const getNonPrimitive = getNonPrimitiveType(typeEnv);

  const fs: Array<[string, Field]> = Object.entries(
    "fields" in typeDef
      ? typeDef.fields
      : typeDef.kind === "complex"
        ? getNonPrimitive(typeDef.value)!.fields
        : {},
  );
  
  const filterFields = (fs: Array<[string, Field]>): Record<string, Field> =>
    Object.fromEntries(
      expand ? fs : fs.filter(([k, _]) => connections.get(props.id)?.includes(k)),
    );

  const Fields: FC = useCallback(
    () => (
      <Stack gap="xs">
        {Object.entries(filterFields(fs)).map(([name, _field]) => (
          <div
            key={name}
            className={classes.nestedField}
            style={{ position: "relative" }}
          >
            <Text size="xs">{name}</Text>
            <Handle
              id={name}
              type="target"
              position={Position.Left}
              className={classes.handle}
            />
          </div>
        ))}
      </Stack>
    ),
    [fs],
  );

  return (
    <div
      className={clsx(
        classes.node,
        classes.blue,
        props.selected && classes.selected,
      )}
    >
      <div
        style={{
          position: "relative",
          padding: "0 0.5rem",
          marginBottom: "0.5rem",
        }}
      >
        {"url" in typeDef && (
          <Tooltip
            target="#node-header"
            label={typeDef.url}
            position="top-start"
          />
        )}
        <Group id="node-header" align="center" justify="start" gap="xs">
          <IconPackage size={16} />
          <Text component="span" size="sm">
            {typeDef.name}
            <Text component="span" size="xs" color="dimmed"> ({asVariableName(typeDef.name) + "_" + extractNumberFromString(props.id)})</Text>
          </Text>
          <Button
              onClick={() => onToggleNodeExpand(!expand, props.id)}
              variant="subtle"
              c="dark"
              fw="normal"
            >
            {expand ? "−" : "+"}
          </Button>
        </Group>
        {props.data.inner && (
          <Handle
            type="source"
            position={Position.Right}
            className={classes.handle}
          />
        )}
        <Handle
          type="target"
          position={Position.Left}
          className={classes.handle}
        />
      </div>
      <div style={{ padding: "0 0.5rem" }}>
        <Fields />
      </div>
    </div>
  );
};
