import { useEffect, useState } from "react";
import "@mantine/core/styles.css";

import { MantineProvider } from "@mantine/core";
import { Editor } from "./pages/Editor";
import MotuPatient from "./MotuPatient.json";
import {
  fetchStructureDefinition,
  parseStructureDefinition,
} from "./model/structure-definition-utils";
import type { Resource } from "./model/fhir-types";
import { TypeEnvironmentContext } from "./providers/TypeEnvironmentProvider";
import {
  SimpleTypeEnvironment,
  type TypeEnvironment,
} from "./model/type-environment";
import type { TypeMap } from "./model/type-map";
import type { URL } from "./model/strict-types";

const names = [
  "Identifier",
  "Patient",
  "Bundle",
  "Resource",
  "Observation",
  "Encounter",
] as string[];

const staticSds = names.map(
  (x) => `https://hapi.fhir.org/baseR4/StructureDefinition/${x}?_format=json`,
);

function App() {
  const [typeEnv, setTypeEnv] = useState<TypeEnvironment | null>(null);

  useEffect(() => {
    Promise.all(staticSds.map(fetchStructureDefinition))
      .then((entries) => entries.filter((t): t is Resource => Boolean(t)))
      .then((entries) =>
        Object.fromEntries(entries.map((t) => [t.url, t] as [URL, Resource])),
      )
      .then((entries) => ({
        ...entries,
        [MotuPatient.url]: parseStructureDefinition(MotuPatient) as Resource,
      }))
      .then((typeMap) => new SimpleTypeEnvironment(typeMap))
      .then((typeEnv) => setTypeEnv(typeEnv));
  }, [staticSds]);

  useEffect(() => {
    console.log(typeEnv);
  }, [typeEnv]);

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
