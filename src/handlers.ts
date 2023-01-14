/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable camelcase */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  CSN, cwdRequireCDS, DatabaseService, EntityDefinition,
  isCDSRequest, NextFunction, Request, VarDefinition
} from "cds-internal-tool";
import { materializedConfig } from "./config";
import { HTTP_HEADER_X_REFRESH_AT, TABLE_MATERIALIZED_REFRESH_JOB } from "./constants";
import { getLogger } from "./logger";
import { getMaterializedViewName, isMaterializedView } from "./materialized";
import { deepClone, privilegedUser } from "./utils";


async function csn4(tenant?: string): Promise<CSN> {
  const cds = cwdRequireCDS();
  const { "cds.xt.ModelProviderService": mp } = cds.services;
  return mp!.getCsn({ tenant, toggles: ["*"], activated: true }); // REVISIT: ['*'] should be the default
}

export async function refreshMaterializedInfo(data: any, req: Request<{ tenant: string, options: any }>) {
  const logger = getLogger();
  const { tenant, options } = req.data;
  if (tenant === materializedConfig.t0) {
    return;
  }
  const cds = cwdRequireCDS();

  // 'deploy' for new subscription while 'upgrade'|'extend' for existed tenant
  const csn = req.event === "deploy" ? (options?.csn ?? await csn4()) : await csn4(tenant);

  const localViews = Object.entries<EntityDefinition>(csn.definitions)
    .filter(([, def]) => isMaterializedView(def))
    .map(([name]) => ({
      view: name,
      refreshAt: "1900-01-01T00:00:00.000Z",
      nextRefreshAt: "1900-01-01T00:00:00.000Z",
    }));

  // after transaction
  req.on("succeeded", async () => {
    const { INSERT, DELETE, SELECT } = cds.ql;
    await cds.tx({ tenant, user: privilegedUser() }, async (tx) => {
      const dbViews: Array<{ view: string }> = await tx.run(SELECT.from(TABLE_MATERIALIZED_REFRESH_JOB).columns("view"));

      /**
       * view existed in db but not in CSN
       */
      const cleanViews = dbViews.filter(dbView => localViews.find(view => view.view === dbView.view) === undefined);
      if (cleanViews.length > 0) {
        logger.info(cleanViews.length, "deprecated materialized view detected, clean them into meta");
        await tx.run(DELETE.from(TABLE_MATERIALIZED_REFRESH_JOB).where({ view: { in: cleanViews } }));
      }

      /**
       * view existed in CSN but not in db
       */
      const newViews = localViews.filter(view => dbViews.find(dbView => dbView.view === view.view) === undefined);
      if (newViews.length > 0) {
        logger.info(localViews.length, "fresh materialized view detected, writing them into meta");
        await tx.run(INSERT.into(TABLE_MATERIALIZED_REFRESH_JOB).entries(...newViews));
      }
    });
  });

}


// TODO: maybe custom builder instead of re-write query

/**
 * rewrite Query for materialized view
 *  
 * @param req 
 * @returns 
 */
export function rewriteQueryForMaterializedView(req: Request) {
  const cds = cwdRequireCDS();
  const { query } = req;

  // @ts-ignore
  if (
    cds.context instanceof cds.Request &&
    cds.context?._?.req?.headers?.["x-cds-materialized-view-disable"] === "true"
  ) {
    return;
  }
  // TODO: maybe req.query could be a string
  // @ts-ignore
  if (typeof query !== "object" || query.SELECT.from.ref.length !== 1 || typeof query?.SELECT?.from?.ref?.[0] !== "string") {
    return;
  }
  // @ts-ignore
  if (!(query.SELECT.from.ref[0] in cds.db.model.definitions)) {
    return;
  }
  // @ts-ignore
  if (!isMaterializedView(cds.db.model.definitions[query.SELECT.from.ref[0]])) {
    // TODO: should use tenant model
    return;
  }
  // @ts-ignore
  const entityName = req.query.SELECT.from.ref[0];
  const viewName = getMaterializedViewName(entityName);

  // @ts-ignore
  req.query.SELECT.from.ref[0] = viewName;

  (req as any).__materialized__ = { entityName, viewName };
}

/**
 * append 
 * 
 * @param this 
 * @param req 
 * @param next 
 * @returns 
 */
export async function appendRefreshAtHeader(this: DatabaseService, req: Request, next: NextFunction) {
  const cds = cwdRequireCDS();
  const { SELECT } = cds.ql;
  if (isCDSRequest(cds.context) && materializedConfig.addRefreshAtHeader) {
    if (typeof (req as any).__materialized__ === "object") {
      const { entityName } = (req as any).__materialized__;
      const r = await this.run(SELECT.one.from(TABLE_MATERIALIZED_REFRESH_JOB).where({ view: entityName }));
      if (r !== null && typeof r.refreshAt === "string") {
        cds.context._.res.header(HTTP_HEADER_X_REFRESH_AT, r.refreshAt);
      }
    }

  }
  return next();
}

export const metaTenantEntities = {
  materialized_refresh_job: {
    kind: "entity",
    elements: {
      view: { key: true, type: "cds.String", length: 255 },
      nextRefreshAt: { type: "cds.Timestamp" },
      refreshAt: { type: "cds.Timestamp" },
    }
  }
};

/**
 * rewrite/enhance tenant CSN with materialized view (table) entities
 * 
 * @param csn 
 * @returns 
 */
export function rewriteAfterCSNRead(csn: CSN) {
  const cds = cwdRequireCDS();
  const logger = getLogger();

  let hasMaterializedView = false;
  for (const [name, def] of Object.entries<VarDefinition>(csn.definitions)) {

    if (!isMaterializedView(def)) {
      continue;
    }

    if (def.kind !== "entity") {
      logger.warn("definition", name, "is not a view, skip processing");
      continue;
    }

    if (def.query === undefined && def.projection === undefined) {
      logger.warn("definition", name, "is a raw entity, skip processing");
      continue;
    }

    const newDef = {
      name: getMaterializedViewName(name),
      kind: "entity",
      elements: deepClone(def.elements)
    } as EntityDefinition;

    for (const [name, ele] of Object.entries(newDef.elements)) {
      if (ele.type === undefined) {
        throw cds.error(`there is not type definition for element ${newDef.name}.${name}`);
      }
    }

    csn.definitions[newDef.name!] = newDef;
    hasMaterializedView = true;
    logger.debug("append materialized view", newDef);

  }

  if (hasMaterializedView) {
    csn.definitions = Object.assign(csn.definitions, metaTenantEntities);
  }

  return csn;
}
