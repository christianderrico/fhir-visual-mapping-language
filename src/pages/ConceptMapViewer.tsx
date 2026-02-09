import {
  Stack,
  Table,
  TextInput,
  Paper,
  SimpleGrid,
  Group,
  Button,
  Text,
  Container,
} from "@mantine/core";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { isUrl } from "src-common/strict-types";

/* ============================
   FHIR R4 Types
============================ */

interface ConceptTarget {
  code: string;
  display?: string;
}

interface ConceptElement {
  sourceCode: string;
  sourceDisplay?: string;
  target?: ConceptTarget;
}

/* ============================
   Component
============================ */

export function ConceptMapViewer() {
  const [uri, setUri] = useState("");
  const [sourceSystem, setSourceSystem] = useState("");
  const [targetSystem, setTargetSystem] = useState("");
  const [elements, setElements] = useState<ConceptElement[]>([]);

  const addElement = () => {
    console.log(uri)
    console.log(isUrl(uri))
    console.log(sourceSystem)
    console.log(targetSystem)
    console.log("ELEMENTS: ", elements)
    setElements((prev) => [
      ...prev,
      {
        sourceCode: "",
        target: {
          code: "",
        },
      },
    ]);
  };

  const removeElement = () => {
    setElements((prev) => prev.slice(0, -1));
  };

  const updateElement = (
    index: number,
    field: keyof ConceptElement,
    value: any
  ) => {
    setElements((prev) =>
      prev.map((el, i) => (i === index ? { ...el, [field]: value } : el))
    );
  };

  const updateTarget = (
    index: number,
    field: keyof ConceptTarget,
    value: any
  ) => {
    setElements((prev) =>
      prev.map((el, i) =>
        i === index && el.target
          ? {
              ...el,
              target: { ...el.target, [field]: value },
            }
          : el
      )
    );
  };

  const isDisabled =
    uri.trim() === "" ||
    sourceSystem.trim() === "" ||
    targetSystem.trim() === "" ||
    elements.length === 0 ||
    elements.some(
      (el) =>
        el.sourceCode.trim() === "" ||
        !el.target?.code ||
        el.target.code.trim() === ""
    );

  const handleCreate = () => {
    const conceptMap = {
      resourceType: "ConceptMap",
      url: uri,
      status: "draft",
      group: [
        {
          source: sourceSystem,
          target: targetSystem,
          element: elements.map((el) => ({
            code: el.sourceCode,
            display: el.sourceDisplay,
            target: el.target
              ? [
                  {
                    code: el.target.code,
                    display: el.target.display,
                    equivalence: "equivalent",
                  },
                ]
              : [],
          })),
        },
      ],
    };

    console.log("FHIR ConceptMap (R4):");
    console.log(JSON.stringify(conceptMap, null, 2));
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="lg">
            <Text fw={600} size="lg">
              ConceptMap (FHIR R4)
            </Text>

            <TextInput
              label="ConceptMap URL"
              withAsterisk
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              placeholder="http://example.org/fhir/ConceptMap/my-map"
            />

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Source CodeSystem"
                withAsterisk
                value={sourceSystem}
                onChange={(e) => setSourceSystem(e.target.value)}
                placeholder="http://hl7.org/fhir/sid/icd-10"
              />
              <TextInput
                label="Target CodeSystem"
                withAsterisk
                value={targetSystem}
                onChange={(e) => setTargetSystem(e.target.value)}
                placeholder="http://snomed.info/sct"
              />
            </SimpleGrid>

            <Group justify="space-between">
              <Text fw={500}>Concept Mappings</Text>
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
                  <Table.Th>Source code</Table.Th>
                  <Table.Th>Target code</Table.Th>
                  <Table.Th>Target display</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {elements.map((el, index) => (
                  <Table.Tr key={index}>
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
                        value={el.target?.code || ""}
                        onChange={(e) =>
                          updateTarget(index, "code", e.target.value)
                        }
                        placeholder="Target code"
                      />
                    </Table.Td>

                    <Table.Td>
                      <TextInput
                        size="xs"
                        value={el.target?.display || ""}
                        onChange={(e) =>
                          updateTarget(index, "display", e.target.value)
                        }
                        placeholder="Target display"
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            <Group justify="flex-end">
              <Button disabled={isDisabled} onClick={handleCreate}>
                Create ConceptMap
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}