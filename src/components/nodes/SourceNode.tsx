import { Text, Group, Stack, Button } from "@mantine/core";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useMemo, type FC } from "react";
import classes from "./Node.module.css";
import clsx from "clsx";
import type { Field, Resource } from "src-common/fhir-types";
import { useTypeEnvironment } from "../../hooks/useTypeEnvironment";
import { getNonPrimitiveType } from "../../model/type-environment-utils";
import { asVariableName, extractNumberFromString } from "src/utils/functions";

const Fields: FC<{
  fields: Record<string, Field>;
}> = ({ fields }) => {
  return (
    <Stack gap="xs">
      {Object.entries(fields).map(([name]) => (
        <div
          key={name}
          className={classes.nestedField}
          style={{ position: "relative" }}
        >
          <Text size="xs">{name}</Text>
          <Handle
            id={name}
            type="source"
            position={Position.Right}
            className={classes.handle}
          />
        </div>
      ))}
    </Stack>
  );
};

type SourceNodeProps = NodeProps<
  Node<{
    type: Resource | Field;
    connections: Map<string, string[]>;
    expand: boolean;
    onToggleNodeExpand: (isExpanded: boolean, id?: string) => void;
    inner?: never;
  }>
>;

export const SourceNode: FC<SourceNodeProps> = (props) => {
  const typeEnvironment = useTypeEnvironment();
  const { type: typeDef, connections, expand, onToggleNodeExpand } = props.data;
  const getNonPrimitive = getNonPrimitiveType(typeEnvironment);

  const fs: Array<[string, Field]> = Object.entries(
    "fields" in typeDef
      ? typeDef.fields
      : typeDef.kind === "complex"
        ? getNonPrimitive(typeDef.value)!.fields
        : {},
  );

  const filterFields = (fs: Array<[string, Field]>): Record<string, Field> =>
    Object.fromEntries(
      expand
        ? fs
        : fs.filter(([k, _]) => connections.get(props.id)?.includes(k)),
    );

  const fields = useMemo(() => {
    return fs.length > 0 ? <Fields fields={filterFields(fs)} /> : "(empty)";
  }, [typeEnvironment, typeDef, expand]);

  return (
    <div
      className={clsx(
        classes.node,
        classes.pink,
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
        <Group align="center" justify="start" gap="xs">
          {/*<IconPackage size={16} />*/}
          <Text component="span" size="sm">
            {typeDef.name}
            <Text
              component="span"
              size="xs"
              color="dimmed"
              contentEditable
              suppressContentEditableWarning={true}
            >
              {" "}
              (
              {asVariableName(typeDef.name) +
                "_" +
                extractNumberFromString(props.id)}
              )
            </Text>
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
            type="target"
            position={Position.Left}
            className={classes.handle}
          />
        )}
        <Handle
          type="source"
          position={Position.Right}
          className={classes.handle}
        />
      </div>
      <div style={{ padding: "0 0.5rem" }}>{fields}</div>
    </div>
  );
};
