export type URL = string & { readonly __brand: unique symbol };

const urlRegex = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;

export function url(unsafe: string): URL {
  const maybe = maybeUrl(unsafe);
  if (maybe !== undefined) {
    return maybe;
  }
  throw new Error(`${unsafe} coulnd't be parsed to a an URL`);
}

export function maybeUrl(unsafe: string): URL | undefined {
  if (urlRegex.test(unsafe)) {
    return unsafe as URL;
  }
  return undefined;
}

export function isUrl(unsafe: string): unsafe is URL {
  return urlRegex.test(unsafe);
}
