import { CQN } from "cds-internal-tool";

export interface ViewRefreshContext {
  /**
   * entity name
   */
  name: string,
  /**
   * tenant id
   */
  tenant: string,
  /**
   * last refresh timestamp
   */
  lastRefreshAt: number,
  /**
   * configured interval
   */
  interval: number,
  /**
   * select
   */
  query?: CQN,
  /**
   * projection
   */
  projection?: any,
  /**
   * is running in another job
   */
  running: boolean,
}
