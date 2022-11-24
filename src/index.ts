/* eslint-disable max-len */
/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { cwdRequireCDS, EntityDefinition } from "cds-internal-tool";
import { materializedConfig } from "./config";
import { ANNOTATIONS } from "./constants";
import { getMaterializedViewName, isMaterializedView } from "./materialized";
import { ViewRefreshContext } from "./types";
import { deepClone } from "./utils";

const cds = cwdRequireCDS();

cds.once("served", () => {

  const logger = cds.log("materialize");

  const {
    "cds.xt.DeploymentService": ds,
    "cds.xt.ModelProviderService": mps,
    db,
  } = cds.services;

  if (ds === undefined) {
    logger.error("cds.xt.DeploymentService is not enabled, cds-materialized-view feature is disabled");
    return;
  }

  // REWRITE: tenant CSN for tenant onboard/upgrade
  mps.prepend(mps => {
    // @ts-ignore
    mps.after("getCsn", (csn: any) => {
      for (const [name, def] of Object.entries<EntityDefinition>(csn.definitions)) {
        if (!isMaterializedView(def)) {
          continue;
        }
        const newDef = {
          name: getMaterializedViewName(name),
          kind: "entity",
          elements: deepClone(def.elements),
        } as EntityDefinition;
        csn.definitions[newDef.name] = newDef;
        logger.debug("append materialized view", newDef);
      }
      return csn;
    });
  });

  // REWRITE: database query
  db.prepend(db => {
    // TODO: maybe custom builder instead of re-write query
    db.before("READ", function _rewrite_materialized_view(req) {
      // @ts-ignore
      if (typeof req.query !== "object" || typeof req.query?.SELECT?.from?.ref?.[0] !== "string") {
        return;
      }
      // @ts-ignore
      if (!(req.query.SELECT.from.ref[0] in db.model.definitions)) {
        return;
      }
      // @ts-ignore
      if (!isMaterializedView(db.model.definitions[req.query.SELECT.from.ref[0]])) {
        // TODO: should use tenant model
        return;
      }
      // @ts-ignore
      req.query.SELECT.from.ref[0] = getMaterializedViewName(req.query.SELECT.from.ref[0]);
    });
  });

  const viewsToBeRefreshed = new Map<string, ViewRefreshContext>();

  // TODO: ensure only have one instance to refresh materialized view

  const { SELECT, INSERT, DELETE } = cds.ql;

  // JOB: refresh view metadata
  setInterval(async () => {
    try {
      // TODO: check tenants is off-board
      const tenants = await cds.tx({ tenant: materializedConfig.t0 }, tx =>
        tx.run(SELECT.from("cds.xt.Tenants").columns("ID"))
      );
      for (const { ID: tenant } of tenants) {
        // @ts-ignore
        const csn = await mps.getCsn({ tenant, toggles: ["*"], activated: true });
        // REVISIT: if tenant get updated
        for (const [name, def] of Object.entries<EntityDefinition>(csn.definitions)) {
          if (!isMaterializedView(def)) {
            continue;
          }
          const key = `${tenant}-${name}`;

          // TODO: detect change
          if (viewsToBeRefreshed.has(key)) {
            continue;
          }

          viewsToBeRefreshed.set(
            key,
            {
              name,
              tenant,
              query: def.query,
              projection: def.projection,
              lastRefreshAt: 0,
              interval: (def[ANNOTATIONS.CDS_MATERIALIZED_INTERVAL] ?? materializedConfig.defaultViewRefreshInterval) * 1000, // TODO: document default value
              running: false,
            }
          );
        }
      }
    }
    catch (error) {
      logger.error("try to refresh materialized view failed", error);
    }
  }, materializedConfig.tenantCheckInterval * 1000);


  // JOB: refresh view content
  setInterval(async () => {
    for (const context of viewsToBeRefreshed.values()) {
      try {
        if (context.lastRefreshAt + context.interval > Date.now()) {
          continue;
        }
        if (context.running) {
          continue;
        }
        context.running = false;
        const viewName = context.name;
        const materializedViewName = getMaterializedViewName(viewName);

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
    }

  }, materializedConfig.viewCheckInterval * 1000);

  // TODO: handler to stop job

});
