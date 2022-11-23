namespace test.resources.csv.app.srv;

using {test.resources.csv.app.db} from '../db/db';

service AppService {

  entity Houses          as projection on db.House;
  entity Peoples         as projection on db.Person;
  entity TypeEntity      as projection on db.ComplexTypeEntity;
  entity UniqPeopleNames as projection on db.UniqPersonNames where Name != 'Theo 1';
}
