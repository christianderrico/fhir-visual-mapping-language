import type { Field, Resource } from "./fhir-types";
import type { TypeEnvironment } from "./type-environment";

type Type = Field | Resource;

interface TypeComparator {
  isSubtypeOf(t1: Type, t2: Type): boolean
}

class TypeComparatorImpl implements TypeComparator {
  constructor(private typeEnvinronment: TypeEnvironment) {}


  // t1 = Patient
  // t2 = Resource
  isSubtypeOf(t1: Type, t2: Type): boolean {

    this.typeEnvinronment
      .getImplementations(t2.name)
      .map(x => x.name)
      .includes(t1.name)


    throw new Error("Method not implemented.");
  }
}

function validate(assignments: [t1: Type, t2: Type], typeComparator: TypeComparator): boolean {
  const [t1, t2] = assignments;

  return typeComparator.isSubtypeOf(t1, t2)

}