import * as fs from "fs";
import * as path from "path";
import fetch from "node-fetch";
import { parseStructureDefinition } from "../src-common/structure-definition-utils";

interface FhirResource {
  resourceType: string;
  id?: string;
  url?: string;
  concept?: Array<{ code: string }>;
  compose?: { include?: Array<{ system: string }> };
}

interface StructureDefinition extends FhirResource {
  name?: string;
  kind?: string;
  type?: string;
  snapshot?: any;
}

const CONFIG = {
  localModule: "hl7.fhir.r4.core",
  outputDir: path.join(".", "src-generated"),
  cacheDir: path.join(".", "src-generated", "metadata"),
  fhirBaseUrl: "https://hl7.org/fhir/R4/",
  resources: {
    valueSetDefinedTypes: "ValueSet/defined-types",
    codeSystemDataTypes: "CodeSystem/data-types",
    codeSystemResourceTypes: "CodeSystem/resource-types",
  },
  forceRegenerate: process.argv.includes("--force"), 
};

function toLocalFilename(canonical: string): string {
  return canonical.replace("/", "-") + ".json";
}

async function loadFhirResource<T extends FhirResource>(canonical: string): Promise<T> {
  const filename = toLocalFilename(canonical);
  const localDir = path.resolve("node_modules", CONFIG.localModule);
  const localPath = path.join(localDir, filename);

  if (fs.existsSync(localPath)) {
    const raw = fs.readFileSync(localPath, "utf-8");
    return JSON.parse(raw) as T;
  }

  const url = new URL(canonical, CONFIG.fhirBaseUrl).toString();
  console.log(`🌐 Fetching ${url}`);
  const res = await fetch(url, { headers: { Accept: "application/fhir+json" } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  return (await res.json()) as T;
}

async function generate() {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  fs.mkdirSync(CONFIG.cacheDir, { recursive: true });

  const valueSet = await loadFhirResource<FhirResource>(
    CONFIG.resources.valueSetDefinedTypes
  );
  const csDataTypes = await loadFhirResource<FhirResource>(
    CONFIG.resources.codeSystemDataTypes
  );
  const csResourceTypes = await loadFhirResource<FhirResource>(
    CONFIG.resources.codeSystemResourceTypes
  );

  const includes = valueSet.compose?.include?.map((i) => i.system) ?? [];
  console.log("📘 Included systems:", includes.join(", "));

  const codeMap = new Map<string, string[]>();
  const maybeAdd = (cs: FhirResource) => {
    if (cs.url && includes.includes(cs.url) && cs.concept) {
      codeMap.set(cs.url, cs.concept.map((c) => c.code));
    }
  };
  maybeAdd(csDataTypes);
  maybeAdd(csResourceTypes);

  const dataTypeCodes = codeMap.get(csDataTypes.url!) ?? [];
  const resourceTypeCodes = codeMap.get(csResourceTypes.url!) ?? [];

  const dataTypesTS = [
    `// Auto-generated from ${csDataTypes.url}`,
    `// Do not edit manually.`,
    ``,
    `export const FHIRDataTypes = ${JSON.stringify(dataTypeCodes.sort(), null, 2)} as const;`,
    ``,
    `export type FHIRDataType = typeof FHIRDataTypes[number];`,
    ``,
  ].join("\n");

  fs.writeFileSync(path.join(CONFIG.outputDir, "FHIRDataTypes.ts"), dataTypesTS);
  console.log(`✅ FHIRDataTypes.ts generated with ${dataTypeCodes.length} entries.`);

  const resourceTypesTS = [
    `// Auto-generated from ${csResourceTypes.url}`,
    `// Do not edit manually.`,
    ``,
    `export const FHIRResourceTypes = ${JSON.stringify(resourceTypeCodes.sort(), null, 2)} as const;`,
    ``,
    `export type FHIRResourceType = typeof FHIRResourceTypes[number];`,
    ``,
  ].join("\n");

  fs.writeFileSync(path.join(CONFIG.outputDir, "FHIRResourceTypes.ts"), resourceTypesTS);
  console.log(`✅ FHIRResourceTypes.ts generated with ${resourceTypeCodes.length} entries.`);

  console.log(`🧩 Generating metadata for each StructureDefinition...`);

  for (const rType of resourceTypeCodes) {
    const outFile = path.join(CONFIG.cacheDir, `${rType}.json`);

    if (!CONFIG.forceRegenerate && fs.existsSync(outFile)) {
      console.log(`⏩ Skipping ${rType} (cached)`);
      continue;
    }

    const canonical = `StructureDefinition/${rType}`;
    try {
      const sd = await loadFhirResource<StructureDefinition>(canonical);
      const reduced = parseStructureDefinition(sd);
      fs.writeFileSync(outFile, JSON.stringify(reduced, null, 2));
      console.log(`✅ Reduced ${rType}`);
    } catch (err) {
      console.warn(`⚠️ Failed to process ${rType}: ${err}`);
    }
  }

  console.log(`🎉 Done. Metadata in ${CONFIG.cacheDir}`);
}

generate().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
