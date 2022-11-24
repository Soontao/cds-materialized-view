import { cwdRequireCDS } from "cds-internal-tool";

export function getLogger() {
  const cds = cwdRequireCDS();
  return cds.log("materialize");
}