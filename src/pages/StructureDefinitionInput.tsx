import {
  Alert,
  Box,
  Button,
  Collapse,
  Divider,
  Group,
  Select,
  Stack,
  Tabs,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconChevronUp,
  IconCode,
  IconDatabase,
  IconSearch,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import _ from "lodash";
import ReactCodeMirror from "@uiw/react-codemirror";
import { StructureDefinitionViewer } from "./StructureDefinitionViewer";
import classes from "./Tabs.module.css";
import { parseStructureDefinition } from "src-common/structure-definition-utils";
import { isResource, type Resource } from "src-common/fhir-types";
import { FhirResourceSearch } from "./FhirResourceSearchProps";

type InputMethod = "select" | "url" | "json";

export interface DefinitionState {
  definition: any | null;
  inputType: InputMethod;
  selectValue: string | null;
  json: string;
  jsonError: string | null;
}

interface StructureDefinitionInputProps {
  label?: "source" | "target";
  state: DefinitionState;
  onChange: (next: DefinitionState) => void;
  selectData: Record<string, Partial<DefinitionState>>;
}

function handleSave(data: Resource) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = data.name;
  a.click();

  URL.revokeObjectURL(url);
}

export function StructureDefinitionInput({
  label,
  state,
  onChange,
  selectData,
}: StructureDefinitionInputProps) {
  const [previewOpened, handlers] = useDisclosure(true);
  const [json, setJson] = useState("");

  const handleJson = (newJson: string) => {
    if (newJson != "") setJson(newJson);

    if (!newJson.trim()) {
      onChange({
        ...state,
        json: "",
        definition: null,
        jsonError: null,
      });
      return;
    }

    try {
      const parsed = parseStructureDefinition(JSON.parse(newJson));
      if (isResource(parsed)) {
        onChange({
          ...state,
          json: newJson,
          definition: parsed,
          selectValue: parsed.name,
          jsonError: null,
        });
      } else {
        onChange({
          ...state,
          json: newJson,
          definition: null,
          jsonError: "JSON is not a valid StructureDefinition",
        });
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        onChange({
          ...state,
          json: newJson,
          definition: null,
          jsonError: err.message,
        });
      }
    }
  };

  const debouncedOnChange = useMemo(
    () => _.debounce(handleJson, 500),
    [onChange, state],
  );

  useEffect(() => {
    handleJson(state.json != "" ? state.json : json);
  }, [state.inputType]);

  const handleJsonChange = (newValue: string) => {
    debouncedOnChange(newValue);
  };

  return (
    <Stack gap="xl">
      <Tabs
        value={state.inputType}
        onChange={(v) => {
          if (!v) return;
          onChange({
            ...state,
            inputType: v as InputMethod,
            definition: null,
            selectValue: null,
            jsonError: null,
            json: "",
          });
        }}
      >
        <Tabs.List>
          <Tabs.Tab
            className={classes.tab}
            value="select"
            leftSection={<IconDatabase size={16} />}
          >
            Select
          </Tabs.Tab>
          <Tabs.Tab
            className={classes.tab}
            value="search"
            leftSection={<IconSearch size={16} />}
          >
            Search
          </Tabs.Tab>
          <Tabs.Tab
            className={classes.tab}
            value="json"
            leftSection={<IconCode size={16} />}
          >
            JSON
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="select" pt="lg">
          <Select
            label="StructureDefinition"
            data={Object.keys(selectData)}
            value={state.selectValue}
            searchable
            clearable
            onChange={(v) => {
              if (!v) return;
              onChange({ ...state, ...selectData[v] });
            }}
            onClear={() =>
              onChange({
                ...state,
                selectValue: null,
                definition: null,
              })
            }
          />
        </Tabs.Panel>

        <Tabs.Panel value="search" pt="lg">
          <FhirResourceSearch
            resourceType={label!}
            onResourceSelect={(resource: Resource) => onChange({...state, definition: resource, selectValue: resource.name})}
          ></FhirResourceSearch>
        </Tabs.Panel>

        <Tabs.Panel value="json" pt="lg">
          <ReactCodeMirror
            lang="json"
            value={json}
            onChange={handleJsonChange}
            basicSetup={{
              lineNumbers: true,
            }}
            height="300px"
          />
          {state.jsonError && (
            <Alert color="red" mt="sm">
              {state.jsonError}
            </Alert>
          )}
        </Tabs.Panel>
      </Tabs>

      <Divider />

      <Group justify="space-between">
        <Title order={3}>Preview</Title>
        <Group>
          <Button
            size="xs"
            variant="light"
            onClick={handlers.toggle}
            rightSection={
              previewOpened ? (
                <IconChevronUp size={14} />
              ) : (
                <IconChevronDown size={14} />
              )
            }
          >
            {previewOpened ? "Hide" : "Show"}
          </Button>
          {state.inputType == "json" && (
            <Button
              size="xs"
              variant="light"
              onClick={() => {
                handleSave(state.definition);
              }}
            >
              Save
            </Button>
          )}
        </Group>
      </Group>

      <Collapse in={previewOpened}>
        <Box>
          <StructureDefinitionViewer definition={state.definition} />
        </Box>
      </Collapse>
    </Stack>
  );
}
