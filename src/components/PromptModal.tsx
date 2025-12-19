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
  Tooltip,
  Box,
} from "@mantine/core";
import { useCallback, useState } from "react";
import type { URL } from "src-common/strict-types";
import type { ValueSetEntry } from "src-common/valueset-types";
import { ExpressionEditor } from "./ExpressionEditor";
import { EditorView } from "codemirror";
import { parser } from "src-generated/grammar/fhir-expression-parser";

export type PromptType =
  | { type: "select"; options: string[]; title: string }
  | { type: "select-option"; options: ValueSetEntry[]; title: string }
  | { type: "select-implementation"; options: URL[]; title: string }
  | { type: "text"; title: string; placeholder?: string }
  | { type: "expression"; title: string; placeholder?: string };

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
      case "text":
      case "expression":
        return "";
      case "select":
      case "select-option":
      case "select-implementation":
        return (prompt as Extract<PromptType, { type: "select" }>).options[0];
    }
  });

  const onModalClose = onClose;
  const onModalSubmit = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (prompt.type === "expression") return onSubmit(parser.parse(value));
      onSubmit(value);
    },
    [onSubmit, value],
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
            renderOption={({ option, checked }) => (
              <>
                <span>{option.value.split("/").splice(-1)}</span>
                <Text fz="xs" c="dimmed">
                  {option.value}
                </Text>
              </>
            )}
          />
        )}
        {prompt?.type === "select" && (
          <Select
            data={prompt.options}
            value={value}
            searchable
            autoSelectOnBlur
            onChange={(value) => value && setValue(value)}
          />
        )}
        {prompt?.type === "text" && (
          <Box h="500px">
            <ExpressionEditor
              value={value!}
              onChange={(e) => setValue(e)}
              extensions={[
                EditorView.theme({
                  "&": {
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    padding: "4px 8px",
                  },
                  ".cm-content": {
                    whiteSpace: "nowrap",
                    overflowX: "auto",
                    fontFamily: "monospace",
                  },
                  ".cm-line": {
                    padding: 0,
                  },
                  ".cm-gutters": {
                    display: "none",
                  },
                }),
              ]}
            />
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
