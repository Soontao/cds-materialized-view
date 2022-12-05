/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { concurrency } from "@newdash/newdash/concurrency";
import { CSN, cwdRequireCDS, EntityDefinition, Service } from "cds-internal-tool";
import { materializedConfig } from "./config";
import { TABLE_MATERIALIZED_REFRESH_JOB } from "./constants";
import { getLogger } from "./logger";
import { getMaterializedViewName, getMaterializedViewRefreshInterval } from "./materialized";
import { MetaRefreshJob } from "./types";
import { privilegedUser } from "./utils";

export async function refreshMaterializedViews() {

  const cds = cwdRequireCDS();
  const logger = getLogger();
  const { SELECT } = cds.ql;
  const { "cds.xt.ModelProviderService": mps } = cds.services;

  try {

    // TODO: cache tenant id
    const tenants: Array<{ ID: string }> = await cds.tx(
      { tenant: materializedConfig.t0, user: privilegedUser() },
      tx => tx.run(SELECT.from("cds.xt.Tenants").columns("ID")),
    );

    const tenantIds = tenants.map(({ ID }) => ID);

    const results = await Promise.allSettled(tenantIds.map(async tenant => {

      // TODO: cache csn maybe
      const csn: CSN = await mps!.tx(
        {
          tenant: materializedConfig.t0,
          user: privilegedUser()
        },
        (tx: any) => tx.getCsn({ tenant, toggles: ["*"], activated: true })
      );

      await cds.tx(
        { tenant, user: privilegedUser() },
        async (tx) => {
          // FOR UPDATE LOCK
          // REVISIT: no wait maybe
          const views: Array<MetaRefreshJob> = await tx.run(
            SELECT
              .from(TABLE_MATERIALIZED_REFRESH_JOB)
              .where({ nextRefreshAt: { "<=": new Date().toISOString() } })
              .forUpdate()
          );

          if (views.length > 0) {
            const results = await Promise.allSettled(views.map(view => refreshSingleView(view, csn, tx)));

            for (const result of results) {
              if (result.status === "rejected") {
                logger.error("refresh view in", tenant, "failed", result.reason);
              }
            }
          }
        }
      );

    }));

    for (const result of results) {
      if (result.status === "rejected") {
        logger.error("refresh materialized view failed", result.reason);
      }
    }
  }
  catch (error) {
    logger.error("un-expected error when refresh materialized views", error);
  }


}
const refreshSingleView = concurrency.limit(
  async function refreshSingleView(view: MetaRefreshJob, csn: any, tx: Service) {
    const cds = cwdRequireCDS();
    const { DELETE, INSERT, UPDATE, SELECT } = cds.ql;

    const viewName = view.view;
    const materializedViewName = getMaterializedViewName(viewName);
    const def: EntityDefinition = csn.definitions[view.view];
    const interval = getMaterializedViewRefreshInterval(def);

    await tx.run(DELETE.from(materializedViewName));
    // @ts-ignore
    await tx.run(INSERT.into(materializedViewName).as(SELECT.from(viewName)));


    // update next refresh time
    await tx.run(
      UPDATE
        .entity(TABLE_MATERIALIZED_REFRESH_JOB)
        .where({ view: view.view })
        .set({
          refreshAt: new Date().toISOString(),
          nextRefreshAt: new Date(Date.now() + interval).toISOString()
        })
    );

  },
  materializedConfig.viewRefreshConcurrency,
);

/**
 * jobs handles
 */
export const jobs = new Set<NodeJS.Timer>();

/**
 * setup jobs
 */
export function setupJobs() {

  const logger = getLogger();
  if (materializedConfig.jobEnabled) {

    // JOB: refresh view content
    jobs.add(
      setInterval(
        refreshMaterializedViews,
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
