export enum PrimitiveDatatypeDef {
    BOOLEAN = "boolean",
    INTEGER = "integer",
    STRING = "string",
    DECIMAL = "decimal",
    URI = "uri",
    CODE = "code",
}

export type NonBackboneElementDef =
    | { type: 'Primitive', value: PrimitiveDatatypeDef }
    | { type: 'Complex', of: string }
    | { type: 'Reference', of: string[] }
    | { type: 'Alternatives', of: Omit<FieldDef, 'min' | 'max'>[] }
    | { type: 'None' }

export type FieldDef =
    (
        | NonBackboneElementDef
        | { type: 'BackboneElement', fields: Record<string, FieldDef> }
        | { type: 'Element', fields: Record<string, FieldDef> }
    ) & {
        name: string,
        path: string,
        min: number,
        max: number | "*",
    }

export type TypeDef =
    // e.g.: Patient { resourceType: "Patient", ... }
    | DomainResource
    // e.g.: CodeableConcept { ... }
    | ComplexElement
    | { type: 'Primitive', name: string, value: PrimitiveDatatypeDef }

export type DomainResource = 
    { type: 'DomainResource', name: string, fields: Record<string, FieldDef> }

export type ComplexElement = 
    { type: 'ComplexElement', name: string, fields: Record<string, FieldDef> }
// // e.g.: Patient.contact { ... }
// | { type: 'BackboneElement', name: string, fields: Record<string, FieldDef> }

export type TypeDefMap = Record<string, TypeDef>;

export function isSubtype(t1: FieldDef, t2: FieldDef): boolean {
    if (t1.type === "Alternatives") throw new Error("TODO: handle alternatives")

    if (t1.type === "Primitive" && t1.value === (t2 as any).value) return true;
    if (t1.type === "Complex" && t2.type === "Complex"
        && t1.of === t2.of) return true;
    if (t1.type === "BackboneElement" && t2.type === "BackboneElement"
        && t1.name === t2.name) return true;

    return false;
}

export function render(field: FieldDef): string {
    if (field.type === "Primitive") return field.value;
    if (field.type === "BackboneElement") return "BackboneElement";
    if (field.type === "Element") return "Element";
    if (field.type === "Complex") return field.of;
    if (field.type === "Reference") return `Reference(${field.of.join("|")})`;
    if (field.type === "Alternatives") return field.of.map(x => render(x as any)).join("|");
        
    throw new Error("Illegal state, type = " + field.type + " for field " + field.path);
}