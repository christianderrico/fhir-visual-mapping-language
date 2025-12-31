import {
  Tabs,
  TextInput,
  Box,
  Group,
  ActionIcon,
  ScrollArea,
} from "@mantine/core";
import "@mantine/core/styles.css";
import { IconPlus, IconX } from "@tabler/icons-react";
import { useState, useCallback } from "react";
import "reactflow/dist/style.css";
import classes from "./tabs.module.css";
import MyModal from "./MyModal.tsx";
import { FlowTabContent } from "./TabPanelContent.tsx";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";

export type Tab = {
  id: string;
  label: string;
};

export interface Disclosure {
  opened: boolean;
  closeModal: () => void;
}

type NodesByTab = {
  [key: string]: Node[];
};

type EdgesByTab = {
  [key: string]: Edge[];
};

export interface FHIRGroupProps {
  name: string;
  sources: string[];
  targets: string[];
  produced: string[];
}

export default function EditorTabs() {
  const [tabs, setTabs] = useState<Tab[]>([{ id: "1", label: "MAIN" }]);
  const [id, setId] = useState(4);

  const [opened, setOpened] = useState<boolean>(false);
  const [nodesByTab, setNodesByTab] = useState<NodesByTab>({
    "1": [],
  });

  const [edgesByTab, setEdgesByTab] = useState<EdgesByTab>({
    "1": [],
  });

  const [activeTab, setActiveTab] = useState<string>("1");
  const [editingTabId, setEditingTabId] = useState<string | null>(null);

  const renameTab = (id: string, value: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, label: value } : t)),
    );
  };

  const addTab = (name: string) => {
    const newTab: Tab = { id: `${id}`, label: name };
    setId(id + 1);
    setTabs((prev) => [...prev, newTab]);
    setNodesByTab((prev) => ({ ...prev, [newTab.id]: [] }));
    setEdgesByTab((prev) => ({ ...prev, [newTab.id]: [] }));
    setOpened(false);
    return newTab;
  };

  const onEdgesChange = useCallback((changes: EdgeChange[], tabId: string) => {
    setEdgesByTab((prev) => ({
      ...prev,
      [tabId]: applyEdgeChanges(changes, prev[tabId] || []),
    }));
  }, []);

    const onNodesChange = useCallback((changes: NodeChange[], tabId: string) => {
    setNodesByTab((prev) => ({
      ...prev,
      [tabId]: applyNodeChanges(changes, prev[tabId] || []),
    }));
  }, []);

  const onConnect = useCallback((connection: Connection, tabId: string) => {
    setEdgesByTab((prev) => ({
      ...prev,
      [tabId]: addEdge(connection, prev[tabId] || []),
    }));
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => prev.filter((v) => v.id !== id));
      setNodesByTab((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setEdgesByTab((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (activeTab === id && tabs.length > 1) {
        const nextTab = tabs.find((t) => t.id !== id);
        nextTab && setActiveTab(nextTab.id);
      }
    },
    [activeTab, tabs],
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
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
        value={activeTab}
        onChange={(v) => v && setActiveTab(v)}
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
          <ScrollArea type="hover" scrollbarSize={8}>
            <Tabs.List
              className={classes.list}
              style={{
                display: "flex",
                flexWrap: "nowrap",
                height: "100%",
                paddingBottom: 0,
              }}
            >
              {tabs.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                  <Tabs.Tab
                    key={tab.id}
                    value={tab.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, tab.label)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (isActive) setEditingTabId(tab.id);
                    }}
                    styles={{
                      root: {
                        height: "100%",
                        padding: 0,
                        marginRight: 2,
                      },
                      tabsList: {
                        border: "none",
                      },
                      tab: {
                        backgroundColor: isActive ? "#a8a8c1ff" : "transparent",
                        color: "#2a2d2e",
                        borderRadius: "4px 4px 0 0",
                        padding: "6px 12px",
                        marginRight: 0,
                        cursor: "pointer",
                        flexShrink: 0,
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        border: "1px solid #ccc",
                        borderBottom: "none",
                      },
                    }}
                  >
                    <Group gap={6} wrap="nowrap" align="center">
                      {editingTabId === tab.id ? (
                        <TextInput
                          autoFocus
                          size="xs"
                          variant="unstyled"
                          value={tab.label}
                          onChange={(e) =>
                            renameTab(tab.id, e.currentTarget.value)
                          }
                          onBlur={() => setEditingTabId(null)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "Escape") {
                              setEditingTabId(null);
                            }
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
                            justifyContent: "space-between",
                            gap: "4px",
                          }}
                        >
                          <span style={{ whiteSpace: "nowrap" }}>
                            {tab.label}
                          </span>
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            onMouseDown={(e: { stopPropagation: () => any }) =>
                              e.stopPropagation()
                            }
                            onClick={(e: { stopPropagation: () => void }) => {
                              e.stopPropagation();
                              closeTab(tab.id);
                            }}
                            style={{
                              width: 14,
                              height: 14,
                              minWidth: 14,
                              backgroundColor: "transparent",
                              border: 0,
                              cursor: "pointer",
                            }}
                          >
                            <IconX size={10} />
                          </ActionIcon>
                        </div>
                      )}
                    </Group>
                  </Tabs.Tab>
                );
              })}
            </Tabs.List>
          </ScrollArea>

          <ActionIcon
            variant="transparent"
            size="lg"
            aria-label="Add new tab"
            onClick={() => setOpened(true)}
            style={{
              flexShrink: 0,
              marginLeft: "4px",
            }}
          >
            <IconPlus size={16} />
          </ActionIcon>
        </div>

        {tabs.map((tab) => (
          <Tabs.Panel
            key={tab.id}
            value={tab.id}
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                position: activeTab === tab.id ? "relative" : "absolute",
                visibility: activeTab === tab.id ? "visible" : "hidden",
                top: 0,
                left: 0,
              }}
            >
              <ReactFlowProvider>
                <FlowTabContent
                  tab={tab}
                  nodes={nodesByTab[tab.id] || []}
                  edges={edgesByTab[tab.id] || []}
                  onNodesChange={(changes) => onNodesChange(changes, tab.id)}
                  onEdgesChange={(changes) => onEdgesChange(changes, tab.id)}
                  
                />
              </ReactFlowProvider>
            </div>
          </Tabs.Panel>
        ))}
      </Tabs>
      <MyModal
        disclosure={{
          opened,
          closeModal: () => setOpened(false),
        }}
        onAddingTab={(name) => {
          const tab = addTab(name);
          setActiveTab(tab.id);
        }}
      />
    </Box>
  );
}
