import { Text, Group, Stack } from "@mantine/core";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useMemo, useState, type FC } from "react";
import classes from "./Node.module.css";
import clsx from "clsx";
import type { Field, Resource } from "src-common/fhir-types";
import { useTypeEnvironment } from "../../hooks/useTypeEnvironment";
import { getNonPrimitiveType } from "../../model/type-environment-utils";

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
  Node<{ type: Resource | Field; inner?: never }>
>;

export const SourceNode: FC<SourceNodeProps> = (props) => {
  const typeEnvironment = useTypeEnvironment();
  const typeDef = props.data.type;
  const [expand, setExpand] = useState(false);
  const getNonPrimitive = getNonPrimitiveType(typeEnvironment);

  const fs: Array<[string, Field]> = Object.entries(
    "fields" in typeDef
      ? typeDef.fields
      : typeDef.kind === "complex"
        ? getNonPrimitive(typeDef.value)!.fields
        : {},
  );

  const [connectedFields, setConnectedFields] = useState<boolean[]>(
    new Array(fs.length).fill(false),
  );

  const filterFields = (fs: Array<[string, Field]>): Record<string, Field> =>
    Object.fromEntries(
      expand ? fs : fs.filter((_, id) => connectedFields[id]),
    );

  const fields = useMemo(() => {
    const handleFieldConnect = (index: number, value:boolean) => {
      setConnectedFields((prev) => {
        const copy = [...prev];
        copy[index] = value;
        return copy;
      });
    };

    return fs.length > 0 ? (
      <Fields
        fields={filterFields(fs)}
      />
    ) : (
      "(empty)"
    );
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
          </Text>
          <button
            style={{
              fontSize: "0.7rem",
              padding: "0.1rem 0.3rem",
              cursor: "pointer",
              backgroundColor: "transparent",
              border: 0,
            }}
            onClick={() => setExpand(!expand)}
          >
            {expand ? "−" : "+"}
          </button>
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
