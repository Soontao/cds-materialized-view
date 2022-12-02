import { cwdRequireCDS } from "cds-internal-tool";
import process from "process";
import { HTTP_HEADER_X_REFRESH_AT } from "./constants";

// TODO: document default value

export const materializedConfig = {

  get t0() {
    return cwdRequireCDS().env.get("requires.multitenancy.t0") ?? "t0";
  },

  /**
   * is job enabled
   */
  get jobEnabled(): boolean {
    // for cloud foundry
    if (process.env.CF_INSTANCE_INDEX !== undefined) {
      // only the first instance will run jobs
      if (
        process.env.CF_INSTANCE_INDEX === "0" &&
        cwdRequireCDS().env.get("materialized.view.refresh.jobs") !== false
      ) {
        return true;
      }
      return false;
    }
    // without cloud foundry
    return cwdRequireCDS().env.get("materialized.view.refresh.jobs") ?? true;
  },

  /**
   * the interval between check each view is refresh or not
   * 
   * in seconds
   */
  get viewCheckInterval() {
    return cwdRequireCDS().env.get("materialized.check.view.interval") ?? 1;
  },

  /**
   * add refresh header or not
   */
  get addRefreshAtHeader() {
    const cds = cwdRequireCDS();
    if (cds.context instanceof cds.Request) {
      if (cds.context.headers[HTTP_HEADER_X_REFRESH_AT] === "true")
        return true;
    }
    return cds.env.get("materialized.view.refresh.header") ?? false;
  },

  /**
   * the default interval between each view to trigger refresh behavior
   * 
   * in seconds
   */
  get defaultViewRefreshInterval() {
    return cwdRequireCDS().env.get("materialized.view.refresh.interval") ?? 3600;
  },

  /**
   * view refresh concurrency. how many view is refreshed in same time
   */
  get viewRefreshConcurrency() {
    return cwdRequireCDS().env.get("materialized.view.refresh.concurrency") ?? 10;
  }

};
