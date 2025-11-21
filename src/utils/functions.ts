export function partition<T>(originalArray: T[], pred: (x: T) => boolean): [T[], T[]] {
  const first: T[] = [];
  const second: T[] = [];
  for (const x of originalArray) (pred(x) ? first : second).push(x);
  return [first, second];
}