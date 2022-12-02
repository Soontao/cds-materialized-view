import { cwdRequireCDS, setupTest } from "cds-internal-tool";
import { HTTP_HEADER_X_REFRESH_AT } from "../src/constants";
import { sleep } from "./utils";

describe("Main Test Suite", () => {

  const axios = setupTest(__dirname, "./app")

  const cds = cwdRequireCDS()

  cds.env.materialized = {
    check: {
      tenant: { interval: 1 },
      view: { interval: 1 },
    }
  }

  axios.defaults.auth = { username: 'alice', password: '' }

  const { clearJobs } = require("../src/jobs")

  it('should subscribe new tenant', async () => {
    // subscribe tenant 1
    await axios.put('/-/cds/saas-provisioning/tenant/t1', {
      "subscribedTenantId": "t1",
      "subscribedSubdomain": "subdomain1",
      "eventType": "CREATE"
    })
    await sleep(2000)
  });

  it('should support get metadata', async () => {
    const { data } = await axios.get("/app/$metadata")
    expect(data).toMatch(/UniqPeopleNames/)
  });

  it('should support query objects', async () => {
    const { data } = await axios.get("/app/UniqPeopleNames")
    expect(data).toMatchSnapshot()
  });

  it('should support query objects with refresh at header', async () => {
    const { headers: h1 } = await axios.get("/app/UniqPeopleNames")
    expect(h1[HTTP_HEADER_X_REFRESH_AT]).toBeUndefined()

    const { headers: h2 } = await axios.get("/app/UniqPeopleNames", {
      headers: {
        [HTTP_HEADER_X_REFRESH_AT]: 'true'
      }
    })
    expect(h2[HTTP_HEADER_X_REFRESH_AT]).toBeDefined()
    expect(isNaN(new Date(h2[HTTP_HEADER_X_REFRESH_AT] as string).getTime())).toBeFalsy()
  });

  it('should support filter', async () => {
    const { data } = await axios.get("/app/UniqPeopleNames?$filter=Name ne 'Theo 2'")
    expect(data).toMatchSnapshot()
  });

  it('should support aggregation', async () => {
    const { data } = await axios.get("/app/MaxHousePrice")
    expect(data).toMatchSnapshot()
  });

  it('should support un-subscribe', async () => {
    await axios.delete('/-/cds/saas-provisioning/tenant/t1')
  });

  afterAll(async () => {
    clearJobs()
    await sleep(1000)
  })

});
