/* eslint-disable @typescript-eslint/ban-ts-comment */

import { cwdRequireCDS, EntityDefinition, Request } from "cds-internal-tool";
import { getMaterializedViewName, isMaterializedView } from "./materialized";
import { deepClone } from "./utils";

const cds = cwdRequireCDS();
const logger = cds.log("materialize");

// TODO: maybe custom builder instead of re-write query

export function rewriteQueryForMaterializedView(req: Request) {
  // TODO: maybe req.query could be a string
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
}

export function rewriteAftreCSNRead(csn: any) {
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
}