import {
  Button,
  Card,
  Divider,
  Group,
  Modal,
  MultiSelect,
  ScrollArea,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { Text } from "@mantine/core";
import { useEffect, useState } from "react";
import type { Disclosure } from "./EditorTabs.tsx";
import { useTypeEnvironment } from "src/hooks/useTypeEnvironment.ts";
import { useFlow } from "src/providers/FlowProvider.tsx";
import _ from "lodash";

interface MyModalProps {
  disclosure: Disclosure;
  isEditableGroup?: true;
}

export default function NewGroupModal({
  disclosure,
  isEditableGroup,
}: MyModalProps) {
  const { opened, closeModal } = disclosure;
  const ctx = useFlow();

  const getResourcesName = (nType: string): string[] => {
    return ctx
      .getActiveNodesAndEdges()
      .nodes.filter((n) => n.origin === undefined && n.type === nType)
      .map((n) => n.data.type.name);
  };

  const [name, setName] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [targets, setTargets] = useState<string[]>([]);
  const [produced, setProduced] = useState<string[]>([]);

  useEffect(() => {
    if (opened && isEditableGroup) {
      setSources(getResourcesName("sourceNode"));
      setTargets(getResourcesName("targetNode"));
      setName(ctx.activeTab);
    }
  }, [opened]);

  const environment = useTypeEnvironment();

  const resetProperties = () => {
    setName("");
    setSources([]);
    setTargets([]);
    setProduced([]);
  };

  function _getResourcesFromOptions(options: string[]) {
    return options.map((opt) => options2Res[opt]);
  }

  function getSources() {
    return _getResourcesFromOptions(sources);
  }

  function getTargets() {
    return _getResourcesFromOptions(targets);
  }

  function getProduced() {
    return _getResourcesFromOptions(produced);
  }

  //const debounceSetter = useCallback(_.debounce(setName, 500), []);

  const options2Res = Object.fromEntries(
    environment.getResources().map((res) => [res.name, res]),
  );

  const options = Object.keys(options2Res).map((o) => ({
    value: o,
    label: o,
  }));

  return (
    <Modal
      opened={opened}
      onClose={() => {
        closeModal();
        resetProperties();
      }}
      title={
        <Title order={3}>{isEditableGroup ? "Edit group" : "New group"}</Title>
      }
      size="lg"
      radius="md"
      padding="xl"
    >
      <Group align="flex-start" grow>
        <Stack gap="md" style={{ flex: 1 }}>
          <TextInput
            label="Name"
            value={name}
            disabled={isEditableGroup && ctx.activeTab === "Main"}
            placeholder="Enter group name"
            onChange={(e) => setName(e.currentTarget.value)}
            required
            withAsterisk
          />

          <MultiSelect
            label="Sources"
            placeholder="Select one or more sources"
            data={options}
            value={sources}
            onChange={setSources}
            searchable
            clearable
            required
            withAsterisk
          />

          <MultiSelect
            label="Target"
            placeholder="Select target"
            data={options}
            value={targets}
            onChange={setTargets}
            searchable
            clearable
            required
            withAsterisk
          />

          <MultiSelect
            label="Produced"
            placeholder="Select produced assets"
            data={options}
            value={produced}
            onChange={setProduced}
            searchable
            clearable
          />

          <Button
            fullWidth
            variant="filled"
            size="md"
            disabled={!name || sources.length === 0 || targets.length === 0}
            onClick={() => {
              if (isEditableGroup) {
                ctx.updateTab(ctx.activeTab, name, getSources(), getTargets());
              } else {
                const isTabAdded = ctx.addTab(name);
                if (isTabAdded) {
                  ctx.addNodes(name, getSources(), "sourceNode");
                  ctx.addNodes(name, getTargets(), "targetNode");
                  resetProperties();
                }
              }
              closeModal();
            }}
          >
            {isEditableGroup ? "Edit" : "Create"}
          </Button>
        </Stack>

        {/* Right side: Live Preview Card */}
        <Stack gap="md" style={{ flex: 1 }}>
          <Text fw={600} size="lg">
            Preview
          </Text>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <ScrollArea h={400}>
              <Stack gap="xs">
                {name && (
                  <>
                    <Text size="sm" c="dimmed">
                      Group Name
                    </Text>
                    <Text fw={500}>{name || "—"}</Text>
                    <Divider my="sm" />
                  </>
                )}

                {sources.length > 0 && (
                  <>
                    <Text size="sm" c="dimmed">
                      Sources ({sources.length})
                    </Text>
                    {sources.map((src) => {
                      const option = options.find((o) => o.value === src);
                      return (
                        <Text key={src} fw={500}>
                          • {option?.label}
                        </Text>
                      );
                    })}
                    <Divider my="sm" />
                  </>
                )}

                {targets.length > 0 && (
                  <>
                    <Text size="sm" c="dimmed">
                      Target ({targets.length})
                    </Text>
                    {targets.map((src) => {
                      const option = options.find((o) => o.value === src);
                      return (
                        <Text key={src} fw={500}>
                          • {option?.label}
                        </Text>
                      );
                    })}
                  </>
                )}

                {produced.length > 0 && (
                  <>
                    <Text size="sm" c="dimmed">
                      Produced ({produced.length})
                    </Text>
                    {produced.map((prod) => {
                      const option = options.find((o) => o.value === prod);
                      return (
                        <Text key={prod} fw={500}>
                          • {option?.label}
                        </Text>
                      );
                    })}
                  </>
                )}

                {!name &&
                  sources.length === 0 &&
                  targets.length === 0 &&
                  produced.length === 0 && (
                    <Text c="dimmed" size="sm" ta="center">
                      Fill in the form to see a live preview here
                    </Text>
                  )}
              </Stack>
            </ScrollArea>
          </Card>
        </Stack>
      </Group>
    </Modal>
  );
}
