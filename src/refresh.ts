/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { concurrency } from "@newdash/newdash/concurrency";
import { cwdRequireCDS, EntityDefinition } from "cds-internal-tool";
import { materializedConfig } from "./config";
import { ANNOTATIONS } from "./constants";
import { getMaterializedViewName, isMaterializedView } from "./materialized";
import { viewsToBeRefreshed } from "./store";
import { ViewRefreshContext } from "./types";
import { deepClone } from "./utils";

const cds = cwdRequireCDS();
const logger = cds.log("materialize");

const { SELECT, INSERT, DELETE } = cds.ql;

export async function refreshTenants() {

  try {
    const tenants: Array<{ ID: string }> = await cds.tx({ tenant: materializedConfig.t0 }, tx =>
      tx.run(SELECT.from("cds.xt.Tenants").columns("ID"))
    );

    const tenantIds = tenants.map(({ ID }) => ID);

    // remove deleted tenant
    for (const [key, view] of viewsToBeRefreshed) {
      if (tenantIds.includes(view.tenant)) {
        return;
      }
      viewsToBeRefreshed.delete(key);
    }

    for (const tenant of tenantIds) {
      // @ts-ignore
      const csn = await mps.getCsn({ tenant, toggles: ["*"], activated: true });
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
            query: def.query,
            projection: def.projection,
            lastRefreshAt: 0,
            interval: (def[ANNOTATIONS.CDS_MATERIALIZED_INTERVAL] ?? materializedConfig.defaultViewRefreshInterval) * 1000,
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
    try {
      if (context.lastRefreshAt + context.interval > Date.now()) {
        return;
      }
      if (context.running) {
        return;
      }
      context.running = false;
      const viewName = context.name;
      const materializedViewName = getMaterializedViewName(viewName);

      logger.info("start refresh view", context.name, "for tenant", context.tenant);

      // run in target tenant
      await cds.tx({ tenant: context.tenant }, async tx => {
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
    }
    catch (error) {
      // TODO: evict after failed too many times
      logger.error("refresh materialized view", getMaterializedViewName(context.name), "failed");
      context.running = false;
    }
  },
  materializedConfig.viewRefreshConcurrency
);


