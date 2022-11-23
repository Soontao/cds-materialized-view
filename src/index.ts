/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { CQN, cwdRequireCDS, Definition, EntityDefinition } from "cds-internal-tool";
import { ANNOTATIONS } from "./constants";
import { deepClone, MATERIALIZED_VIEW_PREFIX } from "./utils";

interface ViewRefreshContext {
  name: string,
  tenant: string,
  lastRefreshAt: number,
  interval: number,
  query?: CQN,
  projection?: any,
  running: boolean,
}

const cds = cwdRequireCDS();

/**
 * check the entity definition is materialized view or not
 * 
 * @param def 
 * @returns 
 */
function isMaterializedView(def: Definition): boolean {
  if (def.query === undefined && def.projection === undefined) {
    return false;
  }
  if (def[ANNOTATIONS.CDS_MATERIALIZED_VIEW] !== true) {
    return false;
  }

  return true;
}

/**
 * format given view name to materialized view name
 * 
 * @param name 
 * @returns 
 */
function getMaterializedViewName(name: string) {
  if (name.startsWith(MATERIALIZED_VIEW_PREFIX)) {
    return name;
  }
  return MATERIALIZED_VIEW_PREFIX + name;
}

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

  db.prepend(db => {
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

  const t0 = cds.env.get("requires.multitenancy.t0") ?? "t0";

  const { SELECT, INSERT, DELETE } = cds.ql;

  setInterval(async () => {
    try {
      const tenants = await cds.tx({ tenant: t0 }, tx =>
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
              interval: (def[ANNOTATIONS.CDS_MATERIALIZED_INTERVAL] ?? 1) * 1000,
              running: false,
            }
          );
        }
      }
    }
    catch (error) {
      logger.error("try to refresh materialized view failed", error);
    }
  }, 15 * 1000); // TODO: parameter


  setInterval(async () => {
    try {
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
          // TODO: failed too many times
          logger.error("refresh materialized view", getMaterializedViewName(context.name), "failed");
          context.running = false;
        }
      }
    }
    catch (error) {
      logger.error("try to refresh materialized view failed", error);
    }
  }, 1 * 1000); // TODO: parameter

});
