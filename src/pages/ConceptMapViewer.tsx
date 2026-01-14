import {
  Stack,
  Table,
  Tabs,
  TextInput,
  Paper,
  SimpleGrid,
  Group,
  Button,
  Text,
  Divider,
  Box,
  Container,
} from "@mantine/core";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import classes from "./Tabs.module.css";
import { isUrl } from "src-common/strict-types";

export function ConceptMapViewer() {
  const checkRows = (): boolean => {
    return rows.filter((r) => r[0] != "" && r[1] != "").length <= 0;
  };

  const [rows, setRows] = useState<[string, string][]>([]);
  const [uri, setUri] = useState("");
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");

  const addRow = () => setRows((prev) => [...prev, ["", ""]]);
  const removeRow = () => setRows((prev) => prev.slice(0, -1));

  console.log(uri);
  console.log(source);
  console.log(target);

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Tabs defaultValue="internal">
          <Tabs.List>
            <Tabs.Tab className={classes.tab} value="internal">
              Internal
            </Tabs.Tab>
            <Tabs.Tab className={classes.tab} value="external">
              External
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="internal" pt="lg">
            <Paper p="lg" radius="md" withBorder>
              <Stack gap="xl">
                <TextInput
                  label="URI"
                  withAsterisk
                  onChange={(e) => setUri(e.target.value)}
                />

                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput
                    label="Source"
                    withAsterisk
                    onChange={(e) => setSource(e.target.value)}
                  />
                  <TextInput
                    label="Target"
                    withAsterisk
                    onChange={(e) => setTarget(e.target.value)}
                  />
                </SimpleGrid>

                <Divider />

                <Box>
                  <Group justify="space-between" mb="xs">
                    <Text fw={500}>Mappings</Text>
                    <Group gap="xs">
                      <Button size="xs" variant="transparent" onClick={addRow}>
                        <IconPlus size={14} />
                      </Button>
                      <Button
                        size="xs"
                        variant="transparent"
                        disabled={rows.length === 0}
                        onClick={removeRow}
                      >
                        <IconMinus size={14} />
                      </Button>
                    </Group>
                  </Group>

                  <Table
                    striped
                    withTableBorder
                    highlightOnHover
                    verticalSpacing="xs"
                  >
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Source field</Table.Th>
                        <Table.Th>Target field</Table.Th>
                      </Table.Tr>
                    </Table.Thead>

                    <Table.Tbody>
                      {rows.length === 0 ? (
                        <Table.Tr>
                          <Table.Td colSpan={2}>
                            <Text c="dimmed" ta="center" size="sm">
                              No mappings defined
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ) : (
                        rows.map(([source, target], index) => (
                          <Table.Tr key={index}>
                            <Table.Td>
                              <TextInput
                                size="xs"
                                value={source}
                                placeholder="Source field"
                                onChange={(e) =>
                                  setRows((prev) =>
                                    prev.map((r, i) =>
                                      i === index ? [e.target.value, r[1]] : r,
                                    ),
                                  )
                                }
                              />
                            </Table.Td>
                            <Table.Td>
                              <TextInput
                                size="xs"
                                value={target}
                                placeholder="Target field"
                                onChange={(e) =>
                                  setRows((prev) =>
                                    prev.map((r, i) =>
                                      i === index ? [r[0], e.target.value] : r,
                                    ),
                                  )
                                }
                              />
                            </Table.Td>
                          </Table.Tr>
                        ))
                      )}
                    </Table.Tbody>
                  </Table>
                </Box>
              </Stack>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="external" pt="lg">
            <Paper p="lg" radius="md" withBorder>
              <TextInput label="URI" withAsterisk />
            </Paper>
          </Tabs.Panel>
        </Tabs>
        <Group justify="space-between">
          <Group />
          <Button
            size="md"
            disabled={
              checkRows() || !isUrl(uri) || source === "" || target === ""
            }
            onClick={() => {
              console.log("Create Concept Map");
            }}
          >
            Create
          </Button>
          <Group />
        </Group>
      </Stack>
    </Container>
  );
}
