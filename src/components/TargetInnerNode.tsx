import { Typography, Text, Group, Stack } from "@mantine/core";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useCallback, useContext, useMemo, type FC } from "react";
import classes from "./Node.module.css"
import clsx from "clsx";
import { IconPackage } from '@tabler/icons-react'
import { TypeDefContext } from "../store/TypeDefContext";
import type { FieldDef, TypeDef } from "../utils/types";

const Fields: FC<{
  fields: Record<string, FieldDef>
}> = ({ fields }) => {
  return (
    <Stack gap="xs">
      {Object.entries(fields).map(([name, field]) =>
        <div key={name} className={classes.nestedField} style={{ position: 'relative' }}>
          <Text size="xs">{name}</Text>
          <Handle id={name} type="target" position={Position.Left} className={classes.handle} />
        </div>
      )}
    </Stack>
  )
}

export const TargetInnerNode: FC<NodeProps<Node<{ fieldDef: FieldDef }>>> = (props) => {
  const { fieldDef } = props.data;
  const typeDefMap = useContext(TypeDefContext);

  const fields = useMemo(() => {

    if (fieldDef instanceof Object && "fields" in fieldDef) {
      return <Fields fields={fieldDef.fields} />
    }
    if (fieldDef.type === "Complex") {
      const t = typeDefMap[fieldDef.of]
      if ('fields' in t) {
        return<Fields fields={t.fields} /> 
      }
    }
    return "(empty)";
  }, [typeDefMap, fieldDef]);

  return (
    <div className={clsx(classes.node, classes.blue, props.selected && classes.selected)}>
      <div style={{ position: "relative", padding: "0 0.5rem", marginBottom: "0.5rem" }}>
        <Group align="center" justify="start" gap="xs">
          <IconPackage size={16} />
          <Text component="span" size="sm">{fieldDef.name}</Text>
        </Group>
        <Handle type="target" position={Position.Left} className={classes.handle} />
        <Handle type="source" position={Position.Right} className={classes.handle} />
      </div>
      <div style={{ padding: "0 0.5rem" }}>
        {fields}
      </div>
    </div>
  )
}