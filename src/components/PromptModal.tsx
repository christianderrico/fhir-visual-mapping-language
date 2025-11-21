import {
  Modal,
  Select,
  TextInput,
  Button,
  Group,
  rem,
  Stack,
} from "@mantine/core";
import { useCallback, useState } from "react";

export type PromptType =
  | { type: "select"; options: string[]; title: string }
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
  const [selectedValue, setSelectValue] = useState<any>();

  const onModalClose = useCallback(() => {
    setSelectValue(undefined);
    onClose();
  }, [onClose]);

  const onModalSubmit = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      e.preventDefault();
      onSubmit(selectedValue);
      setSelectValue(undefined);
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

  return (
    <Modal
      component="form"
      title={prompt?.title}
      opened={opened}
      onClose={onModalClose}
      onSubmit={onModalSubmit}
    >
      <Stack gap={rem(16)}>
        {prompt?.type === "select" && (
          <Select
            data={prompt.options}
            value={selectedValue}
            onChange={(value) => setSelectValue(value)}
          />
        )}
        {prompt?.type === "text" && (
          <TextInput
            data-autofocus
            placeholder={prompt.placeholder}
            value={selectedValue}
            onChange={(e) => setSelectValue(e.target.value)}
          />
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
