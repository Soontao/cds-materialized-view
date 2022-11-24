import { cwdRequireCDS } from "cds-internal-tool";


const cds = cwdRequireCDS();

export const materializedConfig = {

  /**
   * mtxs t0 name
   */
  get t0(): string {
    return cds.env.get("requires.multitenancy.t0") ?? "t0";
  },

  /**
   * the interval between check tenant is update/onboard/off-board
   */
  get tenantCheckInterval() {
    return (cds.env.get("materialized.check.tenant.interval") ?? 60) * 1000;
  },

  /**
   * the interval between check each view is refresh or not
   */
  get viewCheckInterval() {
    return (cds.env.get("materialized.check.view.interval") ?? 1) * 1000;
  },

  /**
   * the default interval between each view to trigger refresh behavior
   */
  get defaultViewRefreshInterval() {
    return (cds.env.get("materialized.default.view.refresh.interval") ?? 3600) * 1000;
  },

};
