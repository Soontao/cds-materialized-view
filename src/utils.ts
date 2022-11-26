import { cwdRequireCDS } from "cds-internal-tool";


export function deepClone<T = any>(obj: T): T {
  if (obj === undefined) {
    return undefined as T;
  }
  if (obj === null) {
    return null as T;
  }
  return JSON.parse(JSON.stringify(obj));
}

export const MATERIALIZED_VIEW_PREFIX = "materialized.";

export function privilegedUser() {
  const cds = cwdRequireCDS();
  return new cds.User.Privileged("materialized-view-job");
}
