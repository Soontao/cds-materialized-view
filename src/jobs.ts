import { materializedConfig } from "./config";
import { getLogger } from "./logger";
import { refreshTenants, refreshView } from "./refresh";
import { viewsToBeRefreshed } from "./store";

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
      setInterval(() => { refreshTenants().catch(getLogger().error); }, materializedConfig.tenantCheckInterval * 1000)
    );

    // JOB: refresh view content
    jobs.add(
      setInterval(
        () => {
          for (const context of viewsToBeRefreshed.values()) {
            refreshView(context).catch(getLogger().error);
          }
        },
        materializedConfig.viewCheckInterval * 1000
      )
    );

  }
  else {
    getLogger().info("materialized view refresh job is not enabled");
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