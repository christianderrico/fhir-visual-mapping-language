import {
  Button,
  Card,
  Container,
  Group,
  Stack,
  Tabs,
  TextInput,
  Title,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import {
  StructureDefinitionInput,
  type DefinitionState,
} from "./StructureDefinitionInput";
import { useEffect, useMemo, useState } from "react";
import classes from "./Tabs.module.css";
import { isResource, type Resource } from "src-common/fhir-types";
import debounce from "lodash/debounce";
import { useNavigate } from "react-router-dom";
import { useFlow } from "src/providers/FlowProvider";
import { ConceptMapViewer } from "./ConceptMapViewer";

const emptyState: DefinitionState = {
  definition: null,
  inputType: "select",
  selectValue: null,
  json: "",
  jsonError: null,
};

const data = Object.fromEntries(
  Object.values(
    import.meta.glob("../../src-generated/metadata/*.json", { eager: true })
  )
    .filter(
      (t): t is Resource =>
        isResource(t) && (t.kind === "resource" || t.kind === "logical")
    )
    .map((r) => [
      r.name,
      {
        definition: { ...r, status: "active" },
        inputType: "select",
        selectValue: r.name,
      } as Partial<DefinitionState>,
    ])
);

export default function MappingDefinitionPage() {
  const [templateName, setTemplateName] = useState("");
  const [outerTab, setOuterTab] = useState<"template" | "map">("template");
  const [activeTab, setActiveTab] = useState<"source" | "target">("source");

  const [source, setSource] = useState<DefinitionState>(emptyState);
  const [target, setTarget] = useState<DefinitionState>(emptyState);

  const ctx = useFlow();
  const navigate = useNavigate();

  const canProceed = Boolean(
    templateName
  );

  const debouncedSetTemplateName = useMemo(
    () => debounce(setTemplateName, 500),
    []
  );

  useEffect(() => {
    return () => {
      debouncedSetTemplateName.cancel();
    };
  }, [debouncedSetTemplateName]);

  return (
    <Tabs value={outerTab} onChange={(v) => setOuterTab(v as any)}>
      <Tabs.List>
        <Tabs.Tab value="template">Define Template</Tabs.Tab>
        <Tabs.Tab value="map">Create Concept Map</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="template">
        <Container size="xl" py="xl">
          <Stack gap="xl">
            <Title order={2}>
              {templateName
                ? `Name: ${templateName}`
                : "Define template name"}
            </Title>

            <TextInput
              label="Template name"
              onChange={(e) =>
                debouncedSetTemplateName(e.currentTarget.value)
              }
            />

            <Card withBorder>
              <Tabs value={activeTab} onChange={(v) => setActiveTab(v as any)}>
                <Tabs.List justify="center">
                  <Tabs.Tab
                    value="source"
                    className={`${classes.mappingtab_source} ${classes.mappingtab}`}
                    rightSection={
                      source.definition && <IconCheck size={14} />
                    }
                  >
                    {source.selectValue
                      ? `Source: ${source.selectValue}`
                      : "Source"}
                  </Tabs.Tab>

                  <Tabs.Tab
                    value="target"
                    className={`${classes.mappingtab_target} ${classes.mappingtab}`}
                    rightSection={
                      target.definition && <IconCheck size={14} />
                    }
                  >
                    {target.selectValue
                      ? `Target: ${target.selectValue}`
                      : "Target"}
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="source" pt="lg">
                  <StructureDefinitionInput
                    label="source"
                    state={source}
                    onChange={setSource}
                    selectData={data}
                  />
                </Tabs.Panel>

                <Tabs.Panel value="target" pt="lg">
                  <StructureDefinitionInput
                    label="target"
                    state={target}
                    onChange={setTarget}
                    selectData={data}
                  />
                </Tabs.Panel>
              </Tabs>
            </Card>

            <Group justify="space-between">
              <Group />
              <Button
                disabled={!canProceed}
                size="md"
                onClick={() => {
                  ctx.startEditor(
                    source.definition!,
                    target.definition!,
                    templateName
                  );
                  navigate("/editor");
                }}
              >
                Create
              </Button>
              <Group />
            </Group>
          </Stack>
        </Container>
      </Tabs.Panel>

      <Tabs.Panel value="map">
        <ConceptMapViewer/>
      </Tabs.Panel>
    </Tabs>
  );
}
