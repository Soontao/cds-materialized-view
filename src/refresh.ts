/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { concurrency } from "@newdash/newdash/concurrency";
import { CSN, cwdRequireCDS, EntityDefinition } from "cds-internal-tool";
import { materializedConfig } from "./config";
import { getLogger } from "./logger";
import { getMaterializedViewName, getMaterializedViewRefreshInterval, isMaterializedView } from "./materialized";
import { viewsToBeRefreshed } from "./store";
import { ViewRefreshContext } from "./types";
import { deepClone } from "./utils";


export async function refreshTenants() {

  const cds = cwdRequireCDS();
  const logger = getLogger();

  const { SELECT } = cds.ql;

  const { "cds.xt.ModelProviderService": mps } = cds.services;

  try {
    const tenants: Array<{ ID: string }> = await cds.tx(
      {
        tenant: materializedConfig.t0,
        user: new cds.User.Privileged("materialized-view-job")
      },
      tx => tx.run(SELECT.from("cds.xt.Tenants").columns("ID"))
    );

    const tenantIds = tenants.map(({ ID }) => ID);

    // remove deleted tenant
    for (const [key, view] of viewsToBeRefreshed) {
      // if tenant still exist
      if (tenantIds.includes(view.tenant)) { return; }
      // if tenant was removed 
      viewsToBeRefreshed.delete(key);
    }

    for (const tenant of tenantIds) {
      const csn: CSN = await mps.tx(
        {
          tenant: materializedConfig.t0,
          user: new cds.User.Privileged("materialized-view-job")
        },
        // @ts-ignore
        tx => tx.getCsn({ tenant, toggles: ["*"], activated: true })
      );
      // REVISIT: if tenant get updated
      for (const [name, def] of Object.entries<EntityDefinition>(csn.definitions)) {
        if (!isMaterializedView(def)) {
          continue;
        }
        const key = `${tenant}-${name}`;

        // update view change. e.g. extension activated
        if (viewsToBeRefreshed.has(key)) {
          const view = viewsToBeRefreshed.get(key);
          view!.query = deepClone(def.query);
          view!.projection = deepClone(def.projection);
          return;
        }

        // add new view
        viewsToBeRefreshed.set(
          key,
          {
            name,
            tenant,
            query: deepClone(def.query),
            projection: deepClone(def.projection),
            lastRefreshAt: 0,
            interval: getMaterializedViewRefreshInterval(def),
            running: false,
          }
        );
      }
    }
  }
  catch (error) {
    logger.error("try to refresh materialized view failed", error);
  }
}


export const refreshView = concurrency.limit(

  async function refreshView(context: ViewRefreshContext) {
    const cds = cwdRequireCDS();
    const logger = getLogger();
    const { INSERT, DELETE } = cds.ql;

    try {
      // if materialized view data is still valid/fresh
      if (context.lastRefreshAt + context.interval > Date.now()) { return; }
      // if its running in an old job maybe
      if (context.running) { return; } // REVISIT: maybe lock by table ?

      context.running = true; // lock

      const viewName = context.name;
      const materializedViewName = getMaterializedViewName(viewName);

      logger.info("refresh view", context.name, "for tenant", context.tenant, "started");

      // run in target tenant
      await cds.tx({ tenant: context.tenant, user: new cds.User.Privileged("materialized-view-job") }, async tx => {
        await tx.run(DELETE.from(materializedViewName));
        // TODO: make the query to be raw query, do not use intermediate views.
        if (context.query) {
          // @ts-ignore
          await tx.run(INSERT.into(materializedViewName).as(context.query));
        }
        if (context.projection) {
          // @ts-ignore
          await tx.run(INSERT.into(materializedViewName).as({ SELECT: context.projection }));
        }
      });

      logger.info("refresh view", context.name, "for tenant", context.tenant, "finished");

      context.lastRefreshAt = Date.now();

    }
    catch (error) {
      // TODO: evict after failed too many times
      logger.error("refresh materialized view", getMaterializedViewName(context.name), "failed");
      context.running = false;
    }
  },
  materializedConfig.viewRefreshConcurrency
);


