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
   * 
   * in seconds
   */
  get tenantCheckInterval() {
    return cds.env.get("materialized.check.tenant.interval") ?? 60;
  },

  /**
   * the interval between check each view is refresh or not
   * 
   * in seconds
   */
  get viewCheckInterval() {
    return cds.env.get("materialized.check.view.interval") ?? 1;
  },

  /**
   * the default interval between each view to trigger refresh behavior
   * 
   * in seconds
   */
  get defaultViewRefreshInterval() {
    return cds.env.get("materialized.default.view.refresh.interval") ?? 3600;
  },

};
