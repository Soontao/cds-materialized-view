
import { setupTest } from "cds-internal-tool";

describe("Main Test Suite", () => {

  const axios = setupTest(__dirname, "./app")

  axios.defaults.auth = { username: 'alice', password: '' }

  beforeAll(async () => {
    // subscribe tenant 1
    await axios.put('/-/cds/saas-provisioning/tenant/t1', {
      "subscribedTenantId": "t1",
      "subscribedSubdomain": "subdomain1",
      "eventType": "CREATE"
    })
  })

  it('should support get metadata', async () => {
    const { data } = await axios.get("/app/$metadata")
    expect(data).toMatch(/UniqPeopleNames/)
  });


});
