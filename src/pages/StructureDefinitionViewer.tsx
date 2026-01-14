import {
  Alert,
  Badge,
  Box,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  Tree,
  type RenderTreeNodePayload,
  type TreeNodeData,
  useTree,
  getTreeExpandedState,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
  IconPointFilled,
} from "@tabler/icons-react";
import { first, isString } from "lodash";
import { useMemo } from "react";
import type { URL } from "src-common/strict-types";
import { basename, isUrl } from "src-common/strict-types";

interface FieldDefinition {
  min: string;
  max: string;
  value?: string | Array<URL>;
  fields?: Record<string, FieldDefinition>;
}

interface StructureDefinition {
  name: string;
  title?: string;
  description?: string;
  fields?: Record<string, FieldDefinition>;
}

interface StructureDefinitionViewerProps {
  definition: StructureDefinition | null;
}

function MyLeaf({
  node,
  tree,
  level,
}: RenderTreeNodePayload & { tree: ReturnType<typeof useTree> }) {
  const [range, value] = node.label.toString().split("_", 2);

  return (
    <Group
      gap="xs"
      style={{
        cursor: node.children ? "pointer" : "default",
        paddingLeft: (level - 1) * 16,
      }}
      onClick={() => tree.toggleExpanded(node.value)}
    >
      <Text size="sm" fw={500}>
        {node.children ? (
          !tree.expandedState[node.value] ? (
            <IconChevronDown size={14} />
          ) : (
            <IconChevronUp size={14} />
          )
        ) : (
          <IconPointFilled size={14} />
        )}{" "}
        {node.value}
      </Text>
      <Badge size="xs" variant="light" color="gray">
        {range}
      </Badge>
      {value && (
        <Text size="xs" fs="italic" c="dimmed">
          {value}
        </Text>
      )}
    </Group>
  );
}

type NestedValue = string | URL | NestedValue[];

function getValue(value: NestedValue | undefined): string {
  if (!value) return "";

  if (isString(value)) {
    return isUrl(value) ? basename(value) : value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "";

    if (value.length === 1) {
      return getValue(first(value));
    }
    
    console.log(value[0])

    return `{ ${value.map((v) => (isString(v) && isUrl(v) ? basename(v) : `${v.kind}: ${getValue(v.value)}`)).join(" | ")} }`;
  }

  if (isUrl(value)) {
    return basename(value);
  }

  return "";
}

function buildTreeData(
  fields?: Record<string, FieldDefinition>,
  path: string[] = [],
): TreeNodeData[] {
  if (!fields) return [];

  return Object.entries(fields).map(([fieldName, field]) => {
    const currentPath = [...path, fieldName];
    const value = currentPath.join(".");

    return {
      value,
      label:
        `${field.min}..${field.max}_${field.value ? getValue(field.value) : ""}`.trim(),
      children: field.fields
        ? buildTreeData(field.fields, currentPath)
        : undefined,
    };
  });
}

export function StructureDefinitionViewer({
  definition,
}: StructureDefinitionViewerProps) {
  if (!definition) {
    return (
      <Alert
        icon={<IconAlertCircle size={16} />}
        title="No definition"
        color="gray"
        variant="light"
      >
        Select or enter a StructureDefinition to view the preview
      </Alert>
    );
  }

  const treeData = useMemo(
    () => buildTreeData(definition.fields),
    [definition.fields],
  );

  const tree = useTree({
    initialExpandedState: getTreeExpandedState(treeData, []),
  });

  return (
    <Card withBorder radius="md" p="sm">
      <Stack gap="xs">
        <Group justify="space-between">
          <Title order={4}>{definition.title || definition.name}</Title>
          <Badge color="blue" size="lg">
            {definition.name}
          </Badge>
        </Group>

        <Text size="sm">
          {definition.description || "No available description"}
        </Text>

        <Divider />

        {treeData.length > 0 && (
          <Box
            h={180}
            style={{
              overflowY: "scroll",
              paddingRight: 8,
              paddingLeft: 4,
            }}
          >
            <Tree
              data={treeData}
              tree={tree}
              renderNode={(payload) => <MyLeaf {...payload} tree={tree} />}
              levelOffset={16}
              clearSelectionOnOutsideClick
            />
          </Box>
        )}
      </Stack>
    </Card>
  );
}
