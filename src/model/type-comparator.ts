import {
  isField,
  isResource,
  type Field,
  type Resource,
} from "src-common/fhir-types";
import type { TypeEnvironment } from "./type-environment";

type Type = Field | Resource;

interface TypeComparator {
  isSubtypeOf(t1: Type, t2: Type): boolean;
}

class TypeComparatorImpl implements TypeComparator {
  constructor(private typeEnvinronment: TypeEnvironment) {}

  private __haveSameType(t1: Type, t2: Type): boolean {
    return (isResource(t1) && isResource(t2)) || (isField(t1) && isField(t2));
  }

  isSubtypeOf(t1: Type, t2: Type): boolean {
    return (
      this.__haveSameType(t1, t2) &&
      this.typeEnvinronment
        .getImplementations(t2.url)
        .map((x) => x.name)
        .includes(t1.name)
    );
  }
}

function validate(
  assignments: [t1: Type, t2: Type],
  typeComparator: TypeComparator,
): boolean {
  const [t1, t2] = assignments;

  return typeComparator.isSubtypeOf(t1, t2);
}
