import {
  Modal,
  Select,
  TextInput,
  Button,
  Group,
  rem,
  Stack,
  type SelectProps,
  Text,
  TooltipGroup,
  Tooltip,
  Flex,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { Datatype } from "src-common/fhir-types";
import type { URL } from "src-common/strict-types";
import type { ValueSetEntry } from "src-common/valueset-types";

export type PromptType =
  | { type: "select"; options: string[]; title: string }
  | { type: "select-option"; options: ValueSetEntry[]; title: string }
  | { type: "select-implementation"; options: URL[]; title: string }
  | { type: "text"; title: string; placeholder?: string }
  | { type: "multi"; fields: { label: string; name: string }[]; title: string };

interface PromptModalProps {
  opened: boolean;
  prompt?: PromptType;
  onSubmit: (value: any) => void;
  onClose: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({
  opened,
  prompt,
  onSubmit,
  onClose,
}) => {
  const [selectedValue, setSelectedValue] = useState<any>();
  const [selectedDatatype, setSelectedDatatype] = useState<string | null>(null);

  const onModalClose = useCallback(() => {
    setSelectedValue(undefined);
    onClose();
  }, [onClose]);

  const onModalSubmit = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      e.preventDefault();

      if (prompt?.type === "text") {
        onSubmit({ value: selectedValue, datatype: selectedDatatype });
      } else {
        onSubmit(selectedValue);
      }
      setSelectedValue(undefined);
      setSelectedDatatype(null);
    },
    [onSubmit, selectedValue],
  );

  const validate = useCallback(() => {
    switch (prompt?.type) {
      case "select":
        return selectedValue !== undefined;
      default:
        return true;
    }
  }, [prompt, selectedValue]);

  const renderSelectOption: SelectProps["renderOption"] = ({
    option,
    checked,
  }) => (
    <Tooltip label={option.description} position="bottom-start" withArrow>
      <Group flex="1" gap="xs">
        {option.label}
        <Text c="dimmed" fz="xs">
          "{option.value}"
        </Text>
      </Group>
    </Tooltip>
  );

  return (
    <Modal
      component="form"
      title={prompt?.title}
      opened={opened}
      onClose={onModalClose}
      onSubmit={onModalSubmit}
    >
      <Stack gap={rem(16)}>
        {prompt?.type === "select-option" && (
          <Select
            data={Object.values(prompt.options).map(({ system, concept }) => ({
              group: system,
              items: concept.map((x) => ({
                value: x.code,
                label: x.display ?? "",
                description: x.definition,
              })),
            }))}
            searchable
            autoSelectOnBlur
            value={selectedValue}
            onChange={(value) => setSelectedValue(value)}
            renderOption={renderSelectOption}
            clearable
          />
        )}
        {prompt?.type === "select-implementation" && (
          <Select
            data={prompt.options}
            value={selectedValue}
            searchable
            autoSelectOnBlur
            onChange={(value) => setSelectedValue(value)}
            renderOption={({ option, checked }) => (
              <>
                <span>{option.value.split("/").splice(-1)}</span>
                <Text fz="xs" color="dimmed">
                  {option.value}
                </Text>
              </>
            )}
          />
        )}
        {prompt?.type === "select" && (
          <Select
            data={prompt.options}
            value={selectedValue}
            searchable
            autoSelectOnBlur
            onChange={(value) => setSelectedValue(value)}
          />
        )}
        {prompt?.type === "text" && (
          <Flex gap={rem(8)}>
            <TextInput
              data-autofocus
              placeholder={prompt.placeholder}
              value={selectedValue}
              onChange={(e) => setSelectedValue(e.target.value)}
              flex={2}
            />
            <Select
              flex={1}
              data={Object.values(Datatype)}
              value={selectedDatatype}
              onChange={setSelectedDatatype}
            />
          </Flex>
        )}
        {prompt?.type === "multi" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              onSubmit(Object.fromEntries(formData.entries()));
            }}
          >
            {prompt.fields.map((f) => (
              <TextInput key={f.name} name={f.name} label={f.label} />
            ))}
            <Button type="submit">Submit</Button>
          </form>
        )}
        <Group gap={rem(16)} justify="end">
          <Button variant="white" color="red" onClick={onModalClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!validate()}>
            Confirm
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
