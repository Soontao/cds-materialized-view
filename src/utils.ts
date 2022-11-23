

export function deepClone<T = any>(obj: T): T {
  if (obj === undefined) {
    return undefined as T;
  }
  if (obj === null) {
    return null as T;
  }
  return JSON.parse(JSON.stringify(obj));
}


export function sleep(timeout: number) {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

export const MATERIALIZED_VIEW_PREFIX = "materialized.";
