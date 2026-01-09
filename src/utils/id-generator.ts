export interface IdGenerator {
  getId(): string;
}

export class LabelIdGenerator implements IdGenerator {
  private counter: number;

  constructor(
    private label: string,
    startFrom: number = 3,
  ) {
    this.counter = startFrom;
  }

  getId(): string {
    return `${this.label}_${this.counter++}`;
  }
}

export class NumberIdGenerator implements IdGenerator {
  private counter: number;

  constructor(
    startFrom: number = 0,
  ) {
    this.counter = startFrom;
  }

  getId(): string {
    return String(this.counter++);
  }
}
