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

- [ ] support create materialized view
  - [ ] filter
  - [ ] aggregation
  - [ ] join base table
  - [ ] virtual
- [ ] shortcut for `$count` query
- [ ] support new service(interface) to support refresh materialized view by API/Rest API

## [LICENSE](./LICENSE)
