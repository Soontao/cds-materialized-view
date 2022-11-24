import { cwdRequireCDS } from "cds-internal-tool";
import process from "process";

const cds = cwdRequireCDS();

// TODO: document default value

export const materializedConfig = {

  get t0() {
    return cds.env.get("requires.multitenancy.t0") ?? "t0";
  },

  /**
   * is job enabled
   */
  get jobEnabled(): boolean {
    // for cloud foundry
    if (process.env.CF_INSTANCE_INDEX !== undefined) {
      // only the first instance will run jobs
      if (process.env.CF_INSTANCE_INDEX === "0" && cds.env.get("materialized.view.refresh.jobs") !== false) {
        return true;
      }
      return false;
    }
    // without cloud foundry
    return cds.env.get("materialized.view.refresh.jobs") ?? true;
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
    return cds.env.get("materialized.view.refresh.interval") ?? 3600;
  },

  /**
   * view refresh concurrenty. how many view is refreshed in same time
   */
  get viewRefreshConcurrency() {
    return cds.env.get("materialized.view.refresh.concurrency") ?? 10;
  }

};
