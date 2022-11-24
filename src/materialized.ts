import { Definition } from "cds-internal-tool";
import { ANNOTATIONS } from "./constants";
import { MATERIALIZED_VIEW_PREFIX } from "./utils";

/**
 * check the entity definition is materialized view or not
 * 
 * @param def 
 * @returns 
 */
export function isMaterializedView(def: Definition): boolean {
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
export function getMaterializedViewName(name: string) {
  if (name.startsWith(MATERIALIZED_VIEW_PREFIX)) {
    return name;
  }
  return MATERIALIZED_VIEW_PREFIX + name;
}
