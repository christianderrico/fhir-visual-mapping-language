export function partition<T>(originalArray: T[], pred: (x: T) => boolean): [T[], T[]] {
  const first: T[] = [];
  const second: T[] = [];
  for (const x of originalArray) (pred(x) ? first : second).push(x);
  return [first, second];
}

export function asVariableName(name: string): string {
  const splitted: string[] = name.split(/(?=[A-Z])/)
  const first: string = splitted[0].toLowerCase()
  return [first, ...splitted.slice(1)].join('')
}

export function extractNumberFromString(name: string): string {
  return name.match(/\d+/)?.[0] ?? ""
}