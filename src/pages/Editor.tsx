import { Button, Divider, Group, Menu, ScrollArea, Title } from "@mantine/core";
import {
  type EdgeChange,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useState, type FC } from "react";
import classes from "./Editor.module.css";
import "./node.css";
import { useDisclosure, useHotkeys } from "@mantine/hooks";
import {
  generateTemplate,
  type GraphProps,
} from "src/model/code-generation/code-generation.ts";
import PreviewModal from "src/components/PreviewModal";
import EditorTabs from "src/components/EditorTabs";
import { useFlow } from "src/providers/FlowProvider";
import { PromptProvider } from "src/providers/PromptProvider";
import { FhirMappingFlow } from "./FhirMappingFlow";
import NewGroupModal from "src/components/NewGroupModal";

export const Editor: FC = () => {
  const ctx = useFlow();
  const [isOpen, setOpened] = useState(false);

  useHotkeys([["Ctrl+z", ctx.undo]]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    ctx.changeEdgesByTab(changes);
  }, []);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    ctx.changeNodesByTab(changes);
  }, []);

  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  const onCollapse = () => {
    ctx.setNodeExpanded(false);
  };

  const onExpand = () => {
    ctx.setNodeExpanded(true);
  };

  const onSave = useCallback(() => {
    if (rfInstance) {
      const flow = rfInstance.toObject();
      localStorage.setItem("saved-item", JSON.stringify(flow));
    }
  }, [rfInstance]);

  // const onRestore = useCallback(() => {
  //   const restoreFlow = async () => {
  //     const item = localStorage.getItem("saved-item");
  //     if (item !== null) {
  //       const flow = JSON.parse(item);

  //       if (flow) {
  //         const { x = 0, y = 0, zoom = 1 } = flow.viewport;
  //         setNodes(flow.nodes || []);
  //         setEdges(flow.edges || []);
  //         setViewport({ x, y, zoom });
  //       }
  //     }
  //   };

  //   restoreFlow();
  // }, [setNodes, setViewport]);

  const [opened, { open, close }] = useDisclosure(false);
  const [myCodeString, setMyCodeString] = useState("");

  return (
    <>
      <header className={classes.header}>
        <div className={classes["header-inner"]}>
          <Group
            gap={10}
            align="baseline"
            wrap="nowrap"
            style={{ flex: 1, minWidth: 0 }}
          >
            <Menu>
              <Menu.Target>
                <Title
                  order={3}
                  style={{
                    paddingTop: 1,
                    minWidth: "10%",
                    textAlign: "center",
                  }}
                >
                  {ctx.templateName}
                </Title>
              </Menu.Target>
            </Menu>
            <Divider orientation="vertical" />
            <Menu>
              <Menu.Target>
                <Button
                  variant="subtle"
                  c="dark"
                  fw="normal"
                  style={{ minWidth: "4%" }}
                >
                  File
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={onSave}>Save</Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <Menu>
              <Menu.Target>
                <Button
                  variant="subtle"
                  c="dark"
                  fw="normal"
                  style={{ minWidth: "4%" }}
                  onClick={(_) => setOpened(true)}
                >
                  Edit
                </Button>
              </Menu.Target>
            </Menu>
            <Menu position="bottom-start" offset={12} width={100}>
              <Menu.Target>
                <Button
                  variant="subtle"
                  c="dark"
                  fw="normal"
                  style={{ minWidth: "5%" }}
                >
                  View
                </Button>
              </Menu.Target>
              <Menu.Dropdown style={{ width: "auto" }}>
                <Menu.Item onClick={onExpand}>Expand nodes</Menu.Item>
                <Menu.Item onClick={onCollapse}>Collapse nodes</Menu.Item>
                <Menu.Item onClick={ctx.onAutoLayout}>Auto-layout</Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <Menu>
              <Menu.Target>
                <Button
                  variant="subtle"
                  c="dark"
                  fw="normal"
                  style={{ minWidth: "6%" }}
                  onClick={() => {
                    setMyCodeString(
                      generateTemplate({
                        templateName: ctx.templateName,
                        groupNodesByTab: ctx.getGroupNodes(),
                        nodes: ctx.nodes,
                        edges: ctx.edges,
                      } as GraphProps),
                    );
                    open();
                  }}
                >
                  Preview
                </Button>
              </Menu.Target>
            </Menu>
            <Divider orientation="vertical" />
            <ScrollArea
              scrollbars="x"
              type="hover"
              scrollbarSize={6}
              styles={{
                root: {
                  overflow: "hidden",
                  maxWidth: "72%",
                },
              }}
            >
              <EditorTabs />
            </ScrollArea>
          </Group>
        </div>
      </header>
      <PreviewModal opened={opened} close={close} FMLCode={myCodeString} />
      <NewGroupModal
        disclosure={{
          opened: isOpen,
          closeModal: () => setOpened(false),
        }}
        isEditableGroup
      />
      <div
        style={{
          width: "100%",
          height: "calc(100vh - 60px)",
          flex: 1,
          minHeight: 0,
          display: "flex",
          top: 0,
          left: 0,
        }}
        className={classes.main}
      >
        <PromptProvider>
          <FhirMappingFlow
            nodes={ctx.getActiveNodesAndEdges().nodes}
            onNodesChange={onNodesChange}
            edges={ctx.getActiveNodesAndEdges().edges}
            onEdgesChange={onEdgesChange}
            onToggleNodeExpand={ctx.setNodeExpanded}
            onInit={setRfInstance}
          />
        </PromptProvider>
      </div>
    </>
  );
};
