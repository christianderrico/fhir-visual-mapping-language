import {v4 as uuid} from 'uuid';

export function makeId(variable: string, field: string | null | undefined): string {
  console.log(variable)
  console.log(field)
  return uuid() //`${variable}.${field ?? "null"}`;// //`${variable}.${field ?? "null"}`;
}
