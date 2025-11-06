import { useEffect, useState } from 'react'
import '@mantine/core/styles.css';

import { MantineProvider } from '@mantine/core';
import { Editor } from './pages/Editor';
import { TypeDefContext } from './store/TypeDefContext';
import MotuPatient from "./MotuPatient.json"
import { fetchStructureDefinition, parseStructureDefinition } from './utils/structure-definition-utils';
import { typeDefMapFromRecord, type Resource, type TypeDefMap } from './utils/fhir-types';

const staticSds = [
  "https://hapi.fhir.org/baseR4/StructureDefinition/Identifier?_format=json",
  "https://hapi.fhir.org/baseR4/StructureDefinition/Patient?_format=json",
  "https://hapi.fhir.org/baseR4/StructureDefinition/Bundle?_format=json",
  "https://hapi.fhir.org/baseR4/StructureDefinition/Resource?_format=json",
]

function App() {
  const [typeDefMap, setTypeDefMap] = useState<TypeDefMap | undefined>(undefined);

  useEffect(() => {
    Promise.all(staticSds.map(fetchStructureDefinition))
      .then(entries => entries.filter((t): t is Resource => Boolean(t)))
      .then(entries => Object.fromEntries(entries.map(t=> [t.name, t] as [string, Resource])))
      .then(entries => ({ ...entries, MotuPatient: parseStructureDefinition(MotuPatient) }))
      .then(x => typeDefMapFromRecord(x as any))
      .then(x => setTypeDefMap(x))
  }, [staticSds]);

  return (
    <MantineProvider>
      <TypeDefContext value={typeDefMap}>
        {typeDefMap !== undefined && <Editor /> }
      </TypeDefContext>
    </MantineProvider>
  )
}

export default App
