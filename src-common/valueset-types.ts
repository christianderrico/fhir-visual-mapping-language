import type { URL } from "./strict-types"

export type ValueSetMap = Record<URL, ValueSet>

export interface ValueSet {
    id: string,
    url: URL,
    include: ValueSetEntry[]
}

export interface ValueSetEntry{
    system: URL,
    concept: ValueSetConcept[]
}

export interface ValueSetConcept {
    code: string
    display?: string
    definition?: string
    designation?: any
    extension?: any
}