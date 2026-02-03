import {
  Stack,
  Table,
  TextInput,
  Paper,
  Group,
  Button,
  Text,
  Container,
} from "@mantine/core";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { isUrl } from "src-common/strict-types";

interface CodeElement {
  sourceCode: string;
  sourceDisplay?: string;
}

export function CodeSystemViewer() {
  const [uri, setUri] = useState("");
  const [elements, setElements] = useState<CodeElement[]>([]);

  const addElement = () => {
    setElements((prev) => [
      ...prev,
      { sourceCode: "", sourceDisplay: "" },
    ]);
  };

  const removeElement = () => {
    setElements((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
  };

  const updateElement = (
    index: number,
    field: keyof CodeElement,
    value: string,
  ) => {
    setElements((prev) =>
      prev.map((el, i) => (i === index ? { ...el, [field]: value } : el)),
    );
  };

  const isDisabled =
    uri.trim() === "" ||
    elements.length === 0 ||
    elements.some((el) => el.sourceCode.trim() === "");

  const handleCreate = () => {
    if (!isUrl(uri)) {
      console.error("Invalid CodeSystem URL");
      return;
    }

    const codeSystem = {
      resourceType: "CodeSystem",
      url: uri,
      status: "active",
      concept: elements.map((el) => ({
        code: el.sourceCode,
        ...(el.sourceDisplay?.trim()
          ? { display: el.sourceDisplay }
          : {}),
      })),
    };

    console.log("FHIR CodeSystem (R4):");
    console.log(JSON.stringify(codeSystem, null, 2));
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="lg">
            <Text fw={600} size="lg">
              CodeSystem (FHIR R4)
            </Text>

            <TextInput
              label="Codesystem URL"
              withAsterisk
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              placeholder="http://example.org/fhir/CodeSystem/my-codes"
            />

            <Group justify="space-between">
              <Text fw={500}>Codes</Text>
              <Group gap="xs">
                <Button size="xs" variant="light" onClick={addElement}>
                  <IconPlus size={14} />
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="red"
                  disabled={elements.length === 0}
                  onClick={removeElement}
                >
                  <IconMinus size={14} />
                </Button>
              </Group>
            </Group>

            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Code</Table.Th>
                  <Table.Th>Display</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {elements.map((el, index) => (
                  <Table.Tr key={`${el.sourceCode}-${index}`}>
                    <Table.Td>
                      <TextInput
                        size="xs"
                        value={el.sourceCode}
                        onChange={(e) =>
                          updateElement(index, "sourceCode", e.target.value)
                        }
                        placeholder="Source code"
                      />
                    </Table.Td>

                    <Table.Td>
                      <TextInput
                        size="xs"
                        value={el.sourceDisplay ?? ""}
                        onChange={(e) =>
                          updateElement(
                            index,
                            "sourceDisplay",
                            e.target.value,
                          )
                        }
                        placeholder="Source display"
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            <Group justify="flex-end">
              <Button disabled={isDisabled} onClick={handleCreate}>
                Create CodeSystem
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}