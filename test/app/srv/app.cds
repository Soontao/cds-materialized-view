namespace test.resources.csv.app.srv;

using {test.resources.csv.app.db} from '../db/db';

service AppService {

  entity Houses          as projection on db.House;
  entity Peoples         as projection on db.Person;
  entity TypeEntity      as projection on db.ComplexTypeEntity;
  @cds.materialized.view // create materialized view
  @cds.materialized.interval : 1 // refresh internval: per second
  entity UniqPeopleNames as projection on db.UniqPersonNames where Name != 'Theo 1';

  @cds.materialized.view
  @cds.materialized.interval : 1
  view MaxHousePrice as
    select max(
      h.price
    ) as maxPrice : Decimal from db.House as h;
}
