export function makeId(variable: string, field: string | null | undefined): string {
  return `${variable}.${field ?? "null"}`;
}
