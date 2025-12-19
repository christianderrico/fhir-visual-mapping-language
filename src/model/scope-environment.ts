import type { URL } from "src-common/strict-types";

export interface ScopeEnvironment {
  exists(name: string): boolean;
  get(name: string): URL | undefined;
  getAll(): string[];
  set(name: string, type: URL): void;
}

export class SimpleScopeEnvironment implements ScopeEnvironment {

  constructor(private scope: Record<string, URL> = {}) {}

  exists(name: string): boolean {
    return name in this.scope;
  }
  get(name: string): URL | undefined {
    return this.scope[name];
  }
  set(name: string, type: URL): void {
    this.scope[name] = type;
  }

  getAll(): string[] {
    return Object.keys(this.scope);
  }
}
