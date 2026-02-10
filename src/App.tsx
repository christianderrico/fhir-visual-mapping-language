import { useEffect, useState } from "react";
import "@mantine/core/styles.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { Editor } from "./pages/Editor";
import type { Resource } from "src-common/fhir-types";
import { TypeEnvironmentContext } from "./providers/TypeEnvironmentProvider";
import {
  SimpleTypeEnvironment,
  type TypeEnvironment,
} from "./model/type-environment";
import type { ValueSet } from "src-common/valueset-types";
import type { URL } from "src-common/strict-types";
import StructureDefinitionPage from "./pages/StructureDefinitionPage";
import { FlowProvider } from "./providers/FlowProvider";
import { ReactFlowProvider } from "@xyflow/react";
import { LoginPage } from "./pages/Login";

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
    //typeMap[MotuPatient.url] = parseStructureDefinition(MotuPatient);
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
        <BrowserRouter>
          <TypeEnvironmentContext.Provider value={typeEnv}>
            <ReactFlowProvider>
              <FlowProvider>
                <Routes>
                  <Route path="/fhir-visual-mapping-language" element={<LoginPage />} />
                  <Route path="/fhir-visual-mapping-language/definition" element={<StructureDefinitionPage />} />
                  <Route path="/fhir-visual-mapping-language/editor" element={<Editor />} />
                </Routes>
              </FlowProvider>
            </ReactFlowProvider>
          </TypeEnvironmentContext.Provider>
        </BrowserRouter>
      )}
    </MantineProvider>
  );
}

export default App;
