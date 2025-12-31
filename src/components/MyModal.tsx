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
import { useState } from "react";
import type { Disclosure } from "./EditorTabs.tsx";

interface MyModalProps {
    disclosure: Disclosure,
    onAddingTab: (name: string) => void
}

export default function MyModal({disclosure, onAddingTab}: MyModalProps) {

  const {opened, closeModal} = disclosure

  const [name, setName] = useState("")
  const [sources, setSources] = useState<string[]>([])
  const [targets, setTargets] = useState<string[]>([])
  const [produced, setProduced] = useState<string[]>([])

  const resetProperties = () => {
    setName("")
    setSources([])
    setTargets([])
    setProduced([])
  }

  // Sample data options (you can replace these with your real data)
  const sourceOptions = [
    { value: "database-postgres", label: "PostgreSQL Database" },
    { value: "database-mysql", label: "MySQL Database" },
    { value: "api-rest", label: "REST API" },
    { value: "file-csv", label: "CSV File" },
    { value: "file-json", label: "JSON File" },
    { value: "warehouse-snowflake", label: "Snowflake Warehouse" },
    { value: "warehouse-bigquery", label: "BigQuery" },
  ];

  const targetOptions = [
    { value: "dashboard-metabase", label: "Metabase Dashboard" },
    { value: "database-redshift", label: "Amazon Redshift" },
    { value: "file-parquet", label: "Parquet File" },
    { value: "api-webhook", label: "Webhook" },
    { value: "storage-s3", label: "S3 Bucket" },
  ];

  const producedOptions = [
    { value: "table-sales", label: "Sales Table" },
    { value: "table-users", label: "Users Table" },
    { value: "report-monthly", label: "Monthly Report" },
    { value: "dataset-cleaned", label: "Cleaned Dataset" },
    { value: "model-predictions", label: "ML Predictions" },
  ];

  return (
    <Modal
      opened={opened}
      onClose={() => {
        closeModal();
        resetProperties()
      }}
      title={<Title order={3}>New group</Title>}
      size="lg"
      radius="md"
      padding="xl"
    >
      <Group align="flex-start" grow>
        {/* Left side: Form */}
        <Stack gap="md" style={{ flex: 1 }}>
          <TextInput
            label="Name"
            placeholder="Enter group name"
            onChange={(e) => setName(e.currentTarget.value)}
            required
            withAsterisk
          />

          <MultiSelect
            label="Sources"
            placeholder="Select one or more sources"
            data={sourceOptions}
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
            data={targetOptions}
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
            data={producedOptions}
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
              onAddingTab(name)
              resetProperties()
            }}
          >
            Create
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
                      const option = sourceOptions.find((o) => o.value === src);
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
                      const option = targetOptions.find((o) => o.value === src);
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
                      const option = producedOptions.find(
                        (o) => o.value === prod
                      );
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
