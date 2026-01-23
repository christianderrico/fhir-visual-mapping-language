import { Text, Stack, Divider, Grid, Paper, Group, px } from "@mantine/core";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { useCallback, type FC } from "react";
import clsx from "clsx";
import classes from "./Node.module.css";
import "./groupNode.css";
import _ from "lodash";
import { range } from "src/utils/functions";

type GroupNodeProps = NodeProps<
  Node<{
    groupName: string;
    sources: string[];
    targets: string[];
  }>
>;

const ROW_HEIGHT = 36;
const HANDLE_WIDTH = 8;
const PADDING = 8;

export const GroupNode: FC<GroupNodeProps> = (props) => {
  const { sources, targets } = props.data;
  const rowCount = Math.max(sources.length, targets.length);

  return (
    <Paper
      radius="md"
      shadow={props.selected ? "md" : "sm"}
      className={clsx(classes.node)}
      p={PADDING}
      style={{
        minWidth: 300,
        overflow: "visible", // Important for handle visibility
        border: "1px solid #DEE2E6",
      }}
    >
      <Group gap={4} style={{ justifyContent: "center", padding: "2%" }}>
        <Text size="sm" fs={"italic"}>
          Group:
        </Text>
        <Text size="sm" fw={600}>
          {props.id.replace(props.data.groupName, "")}
        </Text>
      </Group>

      <Divider mb="md" />

      {/* Rows */}
      <Stack gap={4} style={{ position: "relative" }}>
        {range(rowCount).map((i) => {
          const source = sources[i];
          const target = targets[i];
          const rowKey = `${source || ""}-${target || ""}-${i}`;

          return (
            <Grid
              key={rowKey}
              gutter="xs"
              align="center"
              style={{
                height: ROW_HEIGHT,
                minHeight: ROW_HEIGHT,
                position: "relative",
              }}
            >
              <Grid.Col
                span={6}
                style={{
                  paddingLeft: HANDLE_WIDTH + 4,
                  position: "relative",
                  overflow: "visible",
                }}
              >
                {source && (
                  <>
                    <Handle
                      id={`source-${source}`}
                      type="target"
                      position={Position.Left}
                      className={clsx(classes.pink, classes.handle)}
                      style={{
                        left: "-3px",
                      }}
                    />
                    <Text
                      size="xs"
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#ffdeeb",
                        borderRadius: 4,
                        border: "1px solid #ffdeeb",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textAlign: "center",
                      }}
                      title={source}
                    >
                      {source}
                    </Text>
                  </>
                )}
              </Grid.Col>

              <Grid.Col
                span={6}
                style={{
                  paddingRight: HANDLE_WIDTH + 4,
                  position: "relative",
                  overflow: "visible",
                }}
              >
                {target && (
                  <>
                    <Text
                      size="xs"
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#D0EBFF",
                        borderRadius: 4,
                        border: "1px solid #D0EBFF",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textAlign: "center",
                      }}
                      title={target}
                    >
                      {target}
                    </Text>
                    <Handle
                      id={`target-${target}`}
                      type="source"
                      position={Position.Right}
                      className={clsx(classes.blue, classes.handle)}
                      style={{
                        right: "-3px",
                      }}
                    />
                  </>
                )}
              </Grid.Col>
            </Grid>
          );
        })}
      </Stack>
    </Paper>
  );
};
