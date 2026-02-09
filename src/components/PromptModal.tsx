import {
  Modal,
  Select,
  Button,
  Group,
  rem,
  Stack,
  type SelectProps,
  Text,
  Tooltip,
  Box,
} from "@mantine/core";
import { useCallback, useState } from "react";
import type { URL } from "src-common/strict-types";
import type { ValueSetEntry } from "src-common/valueset-types";
import { ExpressionEditor } from "./ExpressionEditor";
import { parser } from "src-generated/grammar/fhir-expression-parser";

export type PromptType =
  | { type: "select"; options: string[]; title: string }
  | { type: "select-option"; options: ValueSetEntry[]; title: string }
  | { type: "select-implementation"; options: URL[]; title: string }
  | { type: "expression"; title: string; placeholder?: string }
  | {
      type: "alternatives";
      title: string;
      placeholder?: string;
      options: string[];
    };

interface PromptModalProps {
  opened: boolean;
  prompt?: PromptType;
  onSubmit: (value: any) => void;
  onClose: () => void;
}

export function PromptModal({
  opened,
  prompt,
  onSubmit,
  onClose,
}: PromptModalProps) {
  if (prompt === undefined) return;

  const [value, setValue] = useState(() => {
    switch (prompt.type) {
      case "alternatives":
      case "expression":
        return prompt.placeholder ?? "";
      case "select":
      case "select-option":
      case "select-implementation":
        return (prompt as Extract<PromptType, { type: "select" }>).options[0];
    }
  });

  const [option, setOption] = useState("");
  const [condition, setCondition] = useState("");

  const onModalClose = onClose;
  const onModalSubmit = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (prompt.type === "expression" || prompt.type === "alternatives") {
        return onSubmit({
          tree: parser.parse(value),
          value,
          option,
          condition
        });
      }
      onSubmit(value);
    },
    [onSubmit, value, option, condition],
  );

  const renderSelectOption: SelectProps["renderOption"] = ({ option }) => (
    <Tooltip
      label={(option as any).description}
      position="bottom-start"
      withArrow
    >
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
      size="xl"
    >
      <Stack gap={rem(32)}>
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
            value={value}
            onChange={(value) => value && setValue(value)}
            renderOption={renderSelectOption}
            clearable
          />
        )}
        {prompt?.type === "select-implementation" && (
          <Select
            data={prompt.options}
            value={value}
            searchable
            autoSelectOnBlur
            onChange={(value) => value && setValue(value)}
            renderOption={({ option }) => (
              <>
                <span>{option.value.split("/").splice(-1)}</span>
                <Text fz="xs" c="dimmed">
                  {option.value}
                </Text>
              </>
            )}
          />
        )}
        {prompt?.type === "select" ||
          (prompt?.type === "alternatives" && (
            <Stack gap={4}>
            <Text fw={200}>Select option</Text>
            <Select
              data={prompt.options}
              value={prompt.type === "alternatives" ? option : value}
              searchable
              clearable
              autoSelectOnBlur
              onChange={(value) => {
                if (value)
                  if (prompt.type === "alternatives") {
                    setOption(value);
                    setValue("");
                  } else {
                    setValue(value);
                    setOption("");
                  }
              }}
            />
            </Stack>
          ))}
        {(prompt?.type === "expression" || prompt?.type === "alternatives") && (
          <Box h="500px">
            <Stack gap="md">
              {/* Editor principale */}
              <Stack gap={4}>
                <Text fw={200}>Expression</Text>
                <ExpressionEditor
                  value={prompt.type === "alternatives" ? "" : value}
                  onChange={(e) => {
                    setValue(e);
                    setOption("");
                  }}
                />
              </Stack>

              {/* Editor condizionale */}
              {prompt?.type === "expression" && (
                <Stack gap={4}>
                  <Text fw={200}>Condition</Text>
                  <ExpressionEditor
                    value={condition}
                    onChange={(e) => {
                      setCondition(e);
                    }}
                  />
                </Stack>
              )}
            </Stack>
          </Box>
        )}
        <Group gap={rem(16)} justify="end">
          <Button variant="white" color="red" onClick={onModalClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={false}>
            Confirm
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
