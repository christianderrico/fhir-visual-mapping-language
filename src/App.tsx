import { useEffect, useState } from "react";
import "@mantine/core/styles.css";

import { MantineProvider } from "@mantine/core";
import { Editor } from "./pages/Editor";
import type { Resource } from "src-common/fhir-types";
import { TypeEnvironmentContext } from "./providers/TypeEnvironmentProvider";
import {
  SimpleTypeEnvironment,
  type TypeEnvironment,
} from "./model/type-environment";
import MotuPatient from "./MotuPatient.json";
import type { ValueSet, ValueSetEntry } from "src-common/valueset-types";
import type { URL } from "src-common/strict-types";
import { parseStructureDefinition } from "src-common/structure-definition-utils";

const modules = import.meta.glob("../src-generated/metadata/*.json", {
  eager: true,
});
const sets = import.meta.glob("../src-generated/valueset-metadata/*.json", {
  eager: true,
});

function App() {
  const [typeEnv, setTypeEnv] = useState<TypeEnvironment | null>(null);

  useEffect(() => {
    const typeMap = Object.fromEntries(
      Object.entries(modules).map(([_, obj]) => {
        return [(obj as Resource).url, obj] as [string, Resource];
      }),
    );
    typeMap[MotuPatient.url] = parseStructureDefinition(MotuPatient);
    const valueSets = Object.values(sets).map(
      (e: any) => [e.url, e] as [URL, ValueSet],
    );
    setTypeEnv(
      new SimpleTypeEnvironment(typeMap, Object.fromEntries(valueSets)),
    );
  }, []);

  return (
    <MantineProvider>
      {typeEnv && (
        <TypeEnvironmentContext.Provider value={typeEnv}>
          <Editor />
        </TypeEnvironmentContext.Provider>
      )}
    </MantineProvider>
  );
}

export default App;
