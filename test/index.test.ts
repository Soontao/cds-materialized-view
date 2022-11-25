import { cwdRequireCDS, setupTest } from "cds-internal-tool";

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

  const { sleep } = require("../src/utils")
  const { clearJobs } = require("../src/jobs")

  beforeAll(async () => {
    // subscribe tenant 1
    await axios.put('/-/cds/saas-provisioning/tenant/t1', {
      "subscribedTenantId": "t1",
      "subscribedSubdomain": "subdomain1",
      "eventType": "CREATE"
    })
    await sleep(2000)
  })

  it('should support get metadata', async () => {
    const { data } = await axios.get("/app/$metadata")
    expect(data).toMatch(/UniqPeopleNames/)
  });

  it('should support query objects', async () => {
    const { data } = await axios.get("/app/UniqPeopleNames")
    expect(data).toMatchSnapshot()
  });

  it('should support filter', async () => {
    const { data } = await axios.get("/app/UniqPeopleNames?$filter=Name ne 'Theo 2'")
    expect(data).toMatchSnapshot()
  });

  it('should support aggregation', async () => {
    const { data } = await axios.get("/app/MaxHousePrice")
    expect(data).toMatchSnapshot()
  });


  afterAll(async () => {
    clearJobs()
    await sleep(1000)
  })

});
