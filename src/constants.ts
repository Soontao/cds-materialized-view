
export const ANNOTATIONS = {
  /**
   * annotation to create new materialized view
   */
  CDS_MATERIALIZED_VIEW: "@cds.materialized.view",
  /**
   * interval to refresh to materialized view
   */
  CDS_MATERIALIZED_INTERVAL: "@cds.materialized.interval",
  /**
   * cache/materialized count of table
   */
  CDS_MATERIALIZED_COUNT: "@cds.materialized.count",
  /**
   * redirect to low level materialized view, do not create new materialized view
   */
  CDS_MATERIALIZED_REDIRECT: "@cds.materialized.redirect",
};

export const TABLE_MATERIALIZED_REFRESH_JOB = "materialized_refresh_job";
