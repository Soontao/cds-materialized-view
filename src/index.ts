/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable max-len */
/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { cwdRequireCDS } from "cds-internal-tool";
import { refreshMaterializedInfo, rewriteAfterCSNRead, rewriteQueryForMaterializedView } from "./handlers";
import { setupJobs } from "./jobs";
import { getLogger } from "./logger";

const cds = cwdRequireCDS();

cds.once("served", () => {

  const logger = getLogger();

  // TODO: after upgraded, setup the meta of materialized view
  const { "cds.xt.DeploymentService": ds, "cds.xt.ModelProviderService": mps } = cds.services;

  if (ds === undefined) {
    logger.error("cds.xt.DeploymentService is not enabled, cds-materialized-view feature is disabled");
    return;
  }

  if (mps === undefined) {
    logger.error("cds.xt.ModelProviderService is not enabled, cds-materialized-view feature is disabled");
    return;
  }


  // REWRITE: tenant CSN for tenant onboard/upgrade
  mps.prepend((mps: any) => mps.after("getCsn", rewriteAfterCSNRead));

  // REWRITE: insert/update materialized meta view for lock
  ds.prepend((ds) => ds.after(["deploy", "upgrade", "extend"], refreshMaterializedInfo));

  // REWRITE: database query
  cds.db.prepend(db => db.before("READ", rewriteQueryForMaterializedView));

  setupJobs();

  // TODO: ensure only have one instance to refresh materialized view

});

