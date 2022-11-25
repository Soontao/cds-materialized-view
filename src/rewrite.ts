/* eslint-disable @typescript-eslint/ban-ts-comment */
import { cwdRequireCDS, Definition, EntityDefinition, Request } from "cds-internal-tool";
import { getLogger } from "./logger";
import { getMaterializedViewName, isMaterializedView } from "./materialized";
import { deepClone } from "./utils";

// TODO: maybe custom builder instead of re-write query

export function rewriteQueryForMaterializedView(req: Request) {
  const cds = cwdRequireCDS();
  // TODO: maybe req.query could be a string
  // @ts-ignore
  if (typeof req.query !== "object" || typeof req.query?.SELECT?.from?.ref?.[0] !== "string") {
    return;
  }
  // @ts-ignore
  if (!(req.query.SELECT.from.ref[0] in cds.db.model.definitions)) {
    return;
  }
  // @ts-ignore
  if (!isMaterializedView(cds.db.model.definitions[req.query.SELECT.from.ref[0]])) {
    // TODO: should use tenant model
    return;
  }
  // @ts-ignore
  req.query.SELECT.from.ref[0] = getMaterializedViewName(req.query.SELECT.from.ref[0]);
}

export function rewriteAfterCSNRead(csn: any) {
  for (const [name, def] of Object.entries<Definition>(csn.definitions)) {
    if (!isMaterializedView(def)) {
      continue;
    }
    const newDef = {
      name: getMaterializedViewName(name),
      kind: "entity",
      elements: deepClone(def.elements) // TODO: elements type could not be undefined,
    } as EntityDefinition;
    csn.definitions[newDef.name] = newDef;
    getLogger().debug("append materialized view", newDef);
  }
  return csn;
}
