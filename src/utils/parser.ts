import type { FieldDef, PrimitiveDatatypeDef, TypeDef } from "./types";

function parseStructureDefinition(
  structureDefinition: any
): TypeDef {

  const { type, kind, snapshot, name } = structureDefinition;

  if (kind === undefined) throw Error('kind is undefined for structure definition: ' + type);

  if (snapshot !== undefined) {
    const fields = {} as Record<string, FieldDef>;

    for (const elem of snapshot.element) {
      const path = elem.path!!;
      const min = elem.min!!;
      const max = elem.max!!;
      const type = elem.type!!;


      let parts = path.split(".");
      if (parts.length === 1) {
        continue;
      }

      const prefix = parts.slice(1, -1);
      const last = parts.slice(-1)[0]!!;

      let cursor = fields;

      for (const part of prefix) {
        const update = cursor[part];
        if (update === undefined
          || (update.type !== "BackboneElement" && update.type !== "Element")) {
            console.log(structureDefinition);
            throw new Error("Expected Element/BackboneElement at: " + part + " in " + path);
        }
        cursor = update.fields;
      }

      try {

        cursor[last] = parseType(type, last, path, min, max);
      } catch (error) {
        console.error(name);
        throw error;
      }
    }

    return {
      type: "DomainResource",
      name: name!!,
      fields
    };
  }

  throw new Error("not implemented yet");
}

function parseType(type: any[], name: string, path: string, min: number, max: string): FieldDef {
  function go(type: any): FieldDef {
    if (type.code === undefined || type.code.length === 0) {
      throw new Error("No type field in" + type);
    }

    if (type.code === "Element") {
      return {
        type: 'Element',
        fields: {},
        ...props,
      };
    }

    if (type.code === "BackboneElement") {
      return {
        type: "BackboneElement",
        fields: {},
        ...props,
      };
    } 

    if (startsWithLowerCase(type.code)) {
      return {
        type: 'Primitive',
        value: type.code as PrimitiveDatatypeDef,
        ...props,
      };
    }

    if (type.code === "Reference") {
      return {
        type: "Reference",
        of: type.targetProfile!!,
        ...props,
      }
    }
    
    if (startsWithUpperCase(type.code[0]!!)) {
      return {
        type: "Complex",
        of: type.code,
        ...props,
      }
    }

    throw new Error(`TODO: Unhandled type: ${type.code[0]}`);
  }

  const props: Pick<FieldDef, "name" | "path" | "min" | "max"> = {
    name,
    path,
    min, 
    max: max === "*" ? "*" : parseInt(max),
  };

  if (type === undefined) {
    return {
      type: "None",
      ...props,
    }
  }

  if (type.length > 1) {
    return {
      type: "Alternatives",
      of: type.map(go),
      ...props,
    }
  }
  const _type = type[0]!!;
  return go(_type);
}

function startsWithUpperCase(s: string): boolean {
  return s.length === 0 || s[0]?.toUpperCase() === s[0];
}

function startsWithLowerCase(s: string): boolean {
  return s.length === 0 || s[0]?.toLowerCase() === s[0];
}
