import { useCallback, useEffect, useState } from 'react'
import '@mantine/core/styles.css';

import { MantineProvider } from '@mantine/core';
import { Editor } from './pages/Editor';
import { loadStructureDefinition } from './api/structure-definitions';
import type { TypeDef } from './utils/types';
import { TypeDefContext } from './store/TypeDefContext';
import MotuPatient from "./MotuPatient.json"
import { Parser } from './utils/parser';

const staticSds = [
  "https://hapi.fhir.org/baseR4/StructureDefinition/Identifier?_format=json",
  "https://hapi.fhir.org/baseR4/StructureDefinition/Patient?_format=json",
  "https://hapi.fhir.org/baseR4/StructureDefinition/Bundle?_format=json",
  "https://hapi.fhir.org/baseR4/StructureDefinition/Resource?_format=json",
]

function App() {
  const [typeDefMap, setTypeDefMap] = useState({});

  useEffect(() => {
    Promise.all(staticSds.map(loadStructureDefinition))
      .then(entries => Object.fromEntries(entries.map(t=> [t.name, t] as [string, TypeDef])))
      .then(entries => ({ ...entries, MotuPatient: Parser.parseStructureDefinition(MotuPatient) }))
      .then(x => setTypeDefMap(x))
  }, [staticSds]) 

  return (
    <MantineProvider>
      <TypeDefContext value={typeDefMap}>
        {Object.keys(typeDefMap).length > 0 && <Editor /> }
      </TypeDefContext>
    </MantineProvider>
  )
}

export default App
