import {
  Card,
  Modal,
  ScrollArea,
  Tabs,
} from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";

interface PreviewModalProps {
    opened: boolean,
    close: () => void,
    FMLCode: string
}

export default function PreviewModal(props: PreviewModalProps) {
  const {opened, close, FMLCode} = props
  return (
    <Modal
      opened={opened}
      onClose={close}
      title="Preview"
      size={"auto"}
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
    >
      <Card shadow="sm" radius="md" withBorder>
        <Tabs defaultValue="fml">
          <Tabs.List>
            <Tabs.Tab value="fml">FML</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="fml" pt="xs">
            <ScrollArea offsetScrollbars>
              <CodeHighlight
                code={FMLCode}
                language="tsx"
                withCopyButton={false}
                withExpandButton={false}
                styles={{
                  showCodeButton: {
                    display: "none",
                  },
                }}
              />
            </ScrollArea>
          </Tabs.Panel>
        </Tabs>
      </Card>
    </Modal>
  );
}
