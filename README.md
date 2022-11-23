# CDS Materialized View

> Materialized View for CAP NodeJS Runtime

## Get Started

```json
{
  "cds": {
    "plugins": ["cds-rate-limit"]
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
@cds.materialized.interval : 1 // refresh interval: per second
view UniqPersonNames as select distinct Name from Person;
```

## [LICENSE](./LICENSE)
