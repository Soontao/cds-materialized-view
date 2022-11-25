# CDS Materialized View

> Materialized View for CAP NodeJS Runtime

[![npm](https://img.shields.io/npm/v/cds-materialized-view)](https://www.npmjs.com/package/cds-materialized-view)
[![node-test](https://github.com/Soontao/cds-materialized-view/actions/workflows/nodejs.yml/badge.svg)](https://github.com/Soontao/cds-materialized-view/actions/workflows/nodejs.yml)
[![codecov](https://codecov.io/gh/Soontao/cds-materialized-view/branch/main/graph/badge.svg?token=xzBkWloYNR)](https://codecov.io/gh/Soontao/cds-materialized-view)

## Get Started

```json
{
  "cds": {
    "plugins": ["cds-materialized-view"]
  }
}
```

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
