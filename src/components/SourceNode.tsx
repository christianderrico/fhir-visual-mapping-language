import { Typography, Text, Group, Stack } from "@mantine/core";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useContext, useMemo, type FC } from "react";
import classes from "./Node.module.css"
import clsx from "clsx";
import { IconPackage } from "@tabler/icons-react";
import type { ComplexElement, DomainResource, FieldDef } from "../utils/types";
import { TypeDefContext } from "../store/TypeDefContext";

const Fields: FC<{
  fields: Record<string, FieldDef>
}> = ({ fields }) => {
  return (
    <Stack gap="xs">
      {Object.entries(fields).map(([name, field]) =>
        <div key={name} className={classes.nestedField} style={{ position: 'relative' }}>
          <Text size="xs">{name}</Text>
          <Handle id={name} type="source" position={Position.Right} className={classes.handle} />
        </div>
      )}
    </Stack>
  )
}

type SourceNodeProps = 
  | NodeProps<Node<{ type: DomainResource | ComplexElement | FieldDef, inner?: never }>>

export const SourceNode: FC<SourceNodeProps> = (props) => {
  const typeDefMap = useContext(TypeDefContext);
  const typeDef = props.data.type;

  const fields = useMemo(() => {
    if ("fields" in typeDef) {
      return <Fields fields={typeDef.fields} />
    }
    if (typeDef.type === "Complex") {
      const t = typeDefMap[typeDef.of]
      if ('fields' in t) {
        return<Fields fields={t.fields} /> 
      }
    }
    return "(empty)";
  }, [typeDefMap, typeDef]);

  return (
    <div className={clsx(classes.node, classes.pink, props.selected && classes.selected)}>
      <div style={{ position: "relative", padding: "0 0.5rem", marginBottom: "0.5rem" }}>
        <Group align="center" justify="start" gap="xs">
          <IconPackage size={16} />
          <Text component="span" size="sm">{typeDef.name}</Text>
        </Group>
        {props.data.inner && <Handle type="target" position={Position.Left} className={classes.handle} /> }
        <Handle type="source" position={Position.Right} className={classes.handle} />
      </div>
      <div style={{ padding: "0 0.5rem" }}>
        {fields}
      </div>
    </div>
  )
}