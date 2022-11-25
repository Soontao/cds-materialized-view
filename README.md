# CDS Materialized View

> Materialized View for CAP NodeJS Runtime

[![npm](https://img.shields.io/npm/v/cds-materialized-view)](https://www.npmjs.com/package/cds-materialized-view)
[![node-test](https://github.com/Soontao/cds-materialized-view/actions/workflows/nodejs.yml/badge.svg)](https://github.com/Soontao/cds-materialized-view/actions/workflows/nodejs.yml)
[![codecov](https://codecov.io/gh/Soontao/cds-materialized-view/branch/main/graph/badge.svg?token=xzBkWloYNR)](https://codecov.io/gh/Soontao/cds-materialized-view)

## Get Started

### Prerequisites

Project need to enabled the [`cds-mtxs`](https://cap.cloud.sap/docs/guides/multitenancy/mtxs) features firstly, `cds-materialized-view` heavily depends on the module

### Setup

enable plugin

```json
{
  "cds": {
    "plugins": ["cds-materialized-view"],
    "materialized": {
      "view": {
        "refresh": {
          "interval": 1800
        }
      }
    }
  }
}
```

then annotate some view with annotations

```groovy
namespace test.resources.csv.app.db;

entity Person {
  key ID   : Integer;
      Name : String(255);
}

@cds.materialized.view // create materialized view
@cds.materialized.interval : 3600 // refresh interval: per hour
view UniqPersonNames as select distinct Name from Person;
```

now, it works!

## Parameters

- `cds.materialized.view.refresh.jobs` - default `true` - enable job to refresh views, typically maybe need to setup only one instance to run the jobs
- `cds.materialized.view.refresh.interval` - default `3600 seconds` - default global refresh interval for materialized view, for each view developer could use `@cds.materialized.interval` annotation to overwrite this
- `cds.materialized.view.refresh.concurrency` - default `10` - concurrency of materialized view refresh
- `cds.materialized.check.tenant.interval` - default `60 seconds` - interval between refresh the tenant information
- `cds.materialized.check.view.interval` - default `1 second` - interval between collect views need to be refreshed, then refresh them

## Features

- [x] support materialized view
  - [x] create table for materialized view
  - [x] rewrite query
    - [ ] rewrite string query
    - [ ] rewrite array query
  - [x] filter
  - [x] aggregation
  - [ ] view join table
  - [ ] virtual elements
  - [ ] projection join
- [ ] support reuse existed materialized view
- [ ] shortcut for `$count` query
  - [ ] hottest query
  - [ ] count all
- [ ] support to `redirect` to existed materialized view
- [ ] support new service(interface) to support refresh materialized view by API/Rest API

## [LICENSE](./LICENSE)
