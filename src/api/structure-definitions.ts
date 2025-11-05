import { Parser } from "../utils/parser"
import type { TypeDef } from "../utils/types"

type StructureDefinition = {
  name: string,
  title: string,
  status: string,
  abstract: boolean,
  snapshot: {
    element: ElementDefinition[],
  },
} 

type ElementDefinition = {

}

/**
 * It represent a simplified `StructureDefinition`. 
 * 
 * It must have the `snapshot` field.
 * It can be obtained by:
 * - a simple structure definition
 * - applying differential fields on a derivated structure definition
 * - the application of profiles on a structure definition
 */
type FlattenedStructureDefinition = {
  snapshot: {
    element: ElementDefinition[]
  }
}

export async function loadStructureDefinition(uri: string): Promise<TypeDef> {
  const sd = await (await fetch(uri)).json()
  return Parser.parseStructureDefinition(sd);
}