import { Text, Group, Stack } from "@mantine/core";
import { Handle, Position, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { useCallback, useContext, useMemo, type FC } from "react";
import classes from "./Node.module.css"
import clsx from "clsx";
import { IconPackage } from '@tabler/icons-react'
import { TypeDefContext } from "../../store/TypeDefContext";
import type { Field, Resource } from "../../utils/fhir-types";
import { useDisclosure } from "@mantine/hooks";

type TargetNodeProps = 
  | NodeProps<Node<{ type: Resource | Field, inner?: boolean }>>

export const TargetNode: FC<TargetNodeProps> = (props) => {
  const typeDefMap = useContext(TypeDefContext);
  const typeDef = props.data.type;

  const fields = useMemo(() => {
    if ("fields" in typeDef) {
      return typeDef.fields;
    }
    if (typeDef.kind === "complex") {
      const t = typeDefMap.getNonPrimitive(typeDef.value)
      return t?.fields ?? [];
    }
    return [];
  }, [typeDef, typeDefMap])

  const Fields: FC = useCallback(() => 
    <Stack gap="xs">
      {Object.entries(fields).map(([name, _field]) => 
        <div key={name} className={classes.nestedField} style={{ position: 'relative' }}>
          <Text size="xs">{name}</Text>
          <Handle id={name} type="target" position={Position.Left} className={classes.handle} />
        </div>
      )}
    </Stack>
  , [fields]);

  return (
    <div className={clsx(classes.node, classes.blue, props.selected && classes.selected)}>
      <div style={{ position: "relative", padding: "0 0.5rem", marginBottom: "0.5rem" }}>
        <Group align="center" justify="start" gap="xs">
          <IconPackage size={16} />
          <Text component="span" size="sm">{typeDef.name}</Text>
        </Group>
        {props.data.inner && <Handle type="source" position={Position.Right} className={classes.handle} /> }
        <Handle type="target" position={Position.Left} className={classes.handle} />
      </div>
      <div style={{ padding: "0 0.5rem" }}>
        <Fields />
      </div>
    </div>
  )
}
