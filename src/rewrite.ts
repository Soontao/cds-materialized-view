/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { cwdRequireCDS, Definition, EntityDefinition, Request } from "cds-internal-tool";
import { getLogger } from "./logger";
import { getMaterializedViewName, isMaterializedView } from "./materialized";
import { deepClone } from "./utils";

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
  req.query.SELECT.from.ref[0] = getMaterializedViewName(req.query.SELECT.from.ref[0]);
}

/**
 * rewrite/enhance tenant CSN with materialized view (table) entities
 * 
 * @param csn 
 * @returns 
 */
export function rewriteAfterCSNRead(csn: any) {
  const cds = cwdRequireCDS();
  const logger = getLogger();
  for (const [name, def] of Object.entries<Definition>(csn.definitions)) {

    if (!isMaterializedView(def)) {
      continue;
    }

    const newDef = {
      name: getMaterializedViewName(name),
      kind: "entity",
      elements: deepClone(def.elements) // TODO: elements type could not be undefined,
    } as EntityDefinition;

    for (const [name, ele] of Object.entries(newDef.elements)) {
      if (ele.type === undefined) {
        throw cds.error(`there is not type definition for element ${newDef.name}.${name}`);
      }
    }

    csn.definitions[newDef.name] = newDef;
    logger.debug("append materialized view", newDef);

  }
  return csn;
}
