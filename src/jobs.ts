import { cwdRequireCDS } from "cds-internal-tool";
import { materializedConfig } from "./config";
import { refreshTenants, refreshView } from "./refresh";
import { viewsToBeRefreshed } from "./store";

const cds = cwdRequireCDS();
const logger = cds.log("materialize");

/**
 * jobs handles
 */
export const jobs = new Set<NodeJS.Timer>();

/**
 * setup jobs
 */
export function setupJobs() {

  if (materializedConfig.jobEnabled) {

    jobs.add(
      setInterval(() => { refreshTenants().catch(logger.error); }, materializedConfig.tenantCheckInterval * 1000)
    );

    // JOB: refresh view content
    jobs.add(
      setInterval(
        () => {
          for (const context of viewsToBeRefreshed.values()) {
            refreshView(context).catch(logger.error);
          }
        },
        materializedConfig.viewCheckInterval * 1000
      )
    );

  }
  else {
    logger.info("materialized view refresh job is not enabled");
  }

}

/**
 * stop all background jobs
 */
export function clearJobs() {
  for (const job of jobs) {
    clearInterval(job);
  }
}