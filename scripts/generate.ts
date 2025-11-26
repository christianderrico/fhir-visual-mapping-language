import * as fs from "fs";
import * as path from "path";
import {
  getCodeSystem,
  getValuesetsUrl,
  parseStructureDefinition,
  parseValuesetMap,
} from "../src-common/structure-definition-utils";
import { url, type URL } from "../src-common/strict-types";

interface FhirResource {
  resourceType: string;
  id?: string;
  url?: string;
  concept?: Array<{ code: string }>;
  baseDefinition?: URL;
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
  cacheValueSetDir: path.join(".", "src-generated", "valueset-metadata"),
  fhirBaseUrl: "https://hl7.org/fhir/R4/",
  resources: {
    valueSetDefinedTypes: "ValueSet/defined-types",
    codeSystemDataTypes: "CodeSystem/data-types",
    codeSystemResourceTypes: "CodeSystem/resource-types",
  },
  forceRegenerate: process.argv.includes("--force"),
};

function toLocalFilename(canonical: string): string {
  const last_two_elements = -2;
  return canonical.split("/").slice(last_two_elements).join("-") + ".json";
}

async function loadFhirResource<T extends FhirResource>(
  canonical: string,
): Promise<T> {
  const filename = toLocalFilename(canonical);
  const localDir = path.resolve("node_modules", CONFIG.localModule);
  const localPath = path.join(localDir, filename);

  if (fs.existsSync(localPath)) {
    const raw = fs.readFileSync(localPath, "utf-8");
    return JSON.parse(raw);
  }

  console.log(`🌐 Fetching ${canonical}`);
  let isRedirect = false;
  let res: any;
  let requestedUrl = canonical;
  do {
    requestedUrl = requestedUrl.replace(".json1", ".json");
    res = await fetch(url(requestedUrl), {
      headers: { Accept: "application/fhir+json" },
    });
    isRedirect = res.redirected;
    requestedUrl = res.url;
  } while (isRedirect);
  if (!res.ok)
    throw new Error(`Failed to fetch ${canonical}: ${res.statusText}`);
  return (await res.json()) as T;
}

async function generate() {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  fs.mkdirSync(CONFIG.cacheDir, { recursive: true });
  fs.mkdirSync(CONFIG.cacheValueSetDir, { recursive: true });

  const valueSet = await loadFhirResource<FhirResource>(
    CONFIG.fhirBaseUrl + CONFIG.resources.valueSetDefinedTypes,
  );
  const csDataTypes = await loadFhirResource<FhirResource>(
    CONFIG.fhirBaseUrl + CONFIG.resources.codeSystemDataTypes,
  );
  const csResourceTypes = await loadFhirResource<FhirResource>(
    CONFIG.fhirBaseUrl + CONFIG.resources.codeSystemResourceTypes,
  );

  const includes = getCodeSystem(valueSet);
  console.log("📘 Included systems:", includes.join(", "));

  const codeMap = new Map<string, string[]>();
  const maybeAdd = (cs: FhirResource) => {
    if (cs.url && includes.includes(cs.url) && cs.concept) {
      codeMap.set(
        cs.url,
        cs.concept.map((c) => c.code),
      );
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

  fs.writeFileSync(
    path.join(CONFIG.outputDir, "FHIRDataTypes.ts"),
    dataTypesTS,
  );
  console.log(
    `✅ FHIRDataTypes.ts generated with ${dataTypeCodes.length} entries.`,
  );

  const resourceTypesTS = [
    `// Auto-generated from ${csResourceTypes.url}`,
    `// Do not edit manually.`,
    ``,
    `export const FHIRResourceTypes = ${JSON.stringify(resourceTypeCodes.sort(), null, 2)} as const;`,
    ``,
    `export type FHIRResourceType = typeof FHIRResourceTypes[number];`,
    ``,
  ].join("\n");

  fs.writeFileSync(
    path.join(CONFIG.outputDir, "FHIRResourceTypes.ts"),
    resourceTypesTS,
  );
  console.log(
    `✅ FHIRResourceTypes.ts generated with ${resourceTypeCodes.length} entries.`,
  );

  console.log(`🧩 Generating metadata for each StructureDefinition...`);
  const itemsResourceTypeCodes = resourceTypeCodes.concat(dataTypeCodes);
  await writeStructureDefinition(itemsResourceTypeCodes);

  console.log(`🎉 Done. Metadata in ${CONFIG.cacheDir}`);
}

async function writeStructureDefinition(typeCodes: string[]) {
  const codes: Record<URL, StructureDefinition> = {};
  for (const type of typeCodes) {
    const outFile = path.join(CONFIG.cacheDir, `${type}.json`);

    if (!CONFIG.forceRegenerate && fs.existsSync(outFile)) {
      console.log(`⏩ Skipping ${type} (cached)`);
      continue;
    }

    const canonical = `StructureDefinition/${type}`;

    try {
      const sd = await loadFhirResource<StructureDefinition>(canonical);
      const reduced = parseStructureDefinition(sd);
      const vsUrls = await Promise.all(
        getValuesetsUrl(reduced)
          .filter((vs) => vs.includes("hl7.org"))
          .map(loadFhirResource<StructureDefinition>),
      );
      const codeSystems = await Promise.all(
        vsUrls
          .flatMap(getCodeSystem)
          .filter((cs) => cs.includes("hl7.org"))
          .map((s) => s.replace("fhir/", "fhir/codesystem/"))
          .map(loadFhirResource<StructureDefinition>),
      );

      [...vsUrls, ...codeSystems].forEach((sd) => {
        if (sd.url) codes[url(sd.url)] = sd;
      });

      fs.writeFileSync(outFile, JSON.stringify(reduced, null, 2));
      console.log(`✅ Reduced ${type}`);
    } catch (err) {
      console.warn(`⚠️ Failed to process ${type}: ${err}`);
    }
  }
  const reducedSet = parseValuesetMap(codes);
  reducedSet.forEach((reduced) => {
    const outFile = path.join(CONFIG.cacheValueSetDir, `${reduced.id}.json`);
    fs.writeFileSync(outFile, JSON.stringify(reduced, null, 2));
  });
}

generate().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
