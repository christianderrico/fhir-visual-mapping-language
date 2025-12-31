import { Alert, Button, Group, Stack, TextInput } from "@mantine/core";
import { useState } from "react";
import { parseStructureDefinition } from "src-common/structure-definition-utils";

interface FhirResourceSearchProps {
  resourceType: "source" | "target";
  onResourceSelect: (resource: any) => void;
}

export function FhirResourceSearch({
  resourceType,
  onResourceSelect,
}: FhirResourceSearchProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResource = async () => {
    if (!url.trim()) {
      setError("Inserire un URL valido");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`fhir/${url}`, {
        headers: { Accept: "application/fhir+json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.resourceType !== "StructureDefinition") {
        throw new Error("La risorsa non è una StructureDefinition");
      }

      onResourceSelect(parseStructureDefinition(data));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Errore nel recupero della risorsa",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack justify="center" gap="md">
      <Group align="flex-end">
        <TextInput
          label="URL StructureDefinition"
          value={url}
          onChange={(e) => setUrl(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Button onClick={fetchResource} loading={loading}>
          Cerca
        </Button>
      </Group>

      {error && (
        <Alert color="red" variant="light">
          {error}
        </Alert>
      )}
    </Stack>
  );
}
