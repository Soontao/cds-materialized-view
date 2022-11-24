/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable max-len */
/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { cwdRequireCDS } from "cds-internal-tool";
import { clearJobs, setupJobs } from "./jobs";
import { getLogger } from "./logger";
import { rewriteAftreCSNRead, rewriteQueryForMaterializedView } from "./rewrite";

const cds = cwdRequireCDS();

cds.once("served", () => {

  const { "cds.xt.DeploymentService": ds, "cds.xt.ModelProviderService": mps } = cds.services;

  if (ds === undefined) {
    getLogger().error("cds.xt.DeploymentService is not enabled, cds-materialized-view feature is disabled");
    return;
  }

  // REWRITE: tenant CSN for tenant onboard/upgrade
  mps.prepend((mps: any) => { mps.after("getCsn", rewriteAftreCSNRead); });

  // REWRITE: database query
  cds.db.prepend(db => { db.before("READ", rewriteQueryForMaterializedView); });

  setupJobs();

  // TODO: ensure only have one instance to refresh materialized view

});


export { clearJobs };
