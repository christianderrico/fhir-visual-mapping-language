import { Tabs, TextInput, Box, Group, ActionIcon } from "@mantine/core";
import "@mantine/core/styles.css";
import { IconPlus, IconX } from "@tabler/icons-react";
import { useState } from "react";
import classes from "./tabs.module.css";
import NewGroupModal from "./NewGroupModal.tsx";
import { useFlow } from "src/providers/FlowProvider.tsx";

export interface Disclosure {
  opened: boolean;
  closeModal: () => void;
}

export interface FHIRGroupProps {
  name: string;
  sources: string[];
  targets: string[];
  produced: string[];
}

export default function EditorTabs() {
  const ctx = useFlow();

  const [opened, setOpened] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    if (ctx.activeTab !== nodeType) {
      const resByTab = ctx.getNodesByTab(nodeType);

      const { source, target } = resByTab.reduce(
        (acc, n) => {
          if(n.origin)
            return acc
          if (n.type === "sourceNode") acc.source.push(n);
          else if (n.type === "targetNode") acc.target.push(n);
          return acc;
        },
        { source: [], target: [] },
      );

      event.dataTransfer.setData(
        "application/reactflow",
        JSON.stringify({
          id: nodeType,
          groupName: ctx.activeTab,
          sources: source.map((n) => n.data.type.name),
          targets: target.map((n) => n.data.type.name),
        }),
      );
      event.dataTransfer.effectAllowed = "move";
    }
  };

  const commitRename = (tab: string) => {
    if (editValue.trim() && editValue !== tab) {
      ctx.renameTab(tab, editValue.trim());
    }
    setEditingTabId(null);
  };

  return (
    <Box
      sx={{
        backgroundColor: "#1e1e1e",
        padding: 8,
        borderRadius: 6,
        fontFamily: "Segoe UI, system-ui, -apple-system, BlinkMacSystemFont",
        height: "500px",
      }}
    >
      <Tabs
        value={ctx.activeTab}
        onChange={(v) => v && ctx.setActiveTab(v)}
        styles={(theme) => ({
          root: {
            height: "100%",
            display: "flex",
            flexDirection: "column",
          },
          panel: {
            flex: 1,
            minHeight: 0,
            backgroundColor:
              theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
            padding: theme.spacing.md,
          },
        })}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            minHeight: 40,
            borderBottom: "1px solid #a8a8c1ff",
          }}
        >
          <Tabs.List
            className={classes.list}
            style={{
              display: "flex",
              flexWrap: "nowrap",
              height: "100%",
              paddingBottom: 0,
              minWidth: 0,
            }}
          >
            {ctx.tabs.map((tab) => {
              const isActive = tab === ctx.activeTab;

              return (
                <Tabs.Tab
                  key={tab}
                  value={tab}
                  draggable
                  onDragStart={(e) => onDragStart(e, tab)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (isActive) {
                      setEditingTabId(tab);
                      setEditValue(tab);
                    }
                  }}
                  styles={{
                    root: {
                      height: "100%",
                      padding: 0,
                      marginRight: 2,
                    },
                    tab: {
                      borderRadius: "4px 4px 0 0",
                      padding: "6px 12px",
                      cursor: "pointer",
                      flexShrink: 0,
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      border: "1px solid #ccc",
                      borderBottom: "none",
                    },
                    tabLabel: {
                      color: isActive ? "#6CB2EE" : undefined,
                    },
                  }}
                >
                  <Group gap={6} wrap="nowrap" align="center">
                    {editingTabId === tab ? (
                      <TextInput
                        autoFocus
                        size="xs"
                        variant="unstyled"
                        value={editValue}
                        onChange={(e) => setEditValue(e.currentTarget.value)}
                        onBlur={() => commitRename(tab)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(tab);
                          if (e.key === "Escape") setEditingTabId(null);
                        }}
                        styles={{
                          input: {
                            color: "black",
                            fontSize: 13,
                            padding: 0,
                          },
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span style={{ whiteSpace: "nowrap" }}>{tab}</span>
                        {tab !== "Main" && (
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              ctx.removeTab(tab);
                            }}
                            style={{
                              width: 14,
                              height: 14,
                              minWidth: 14,
                            }}
                          >
                            <IconX size={10} />
                          </ActionIcon>
                        )}
                      </div>
                    )}
                  </Group>
                </Tabs.Tab>
              );
            })}

            <ActionIcon
              variant="transparent"
              size="lg"
              aria-label="Add new tab"
              onClick={() => setOpened(true)}
              style={{ flexShrink: 0, marginLeft: 4 }}
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Tabs.List>
        </div>
      </Tabs>

      <NewGroupModal
        disclosure={{
          opened,
          closeModal: () => setOpened(false),
        }}
      />
    </Box>
  );
}
