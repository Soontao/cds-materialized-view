namespace test.resources.csv.app.db;

using {cuid} from '@sap/cds/common';

type Address {
  Country  : String(255);
  Province : String(255);
  City     : String(255);
  Street   : String(255);
}

@cds.search : {
  address_Country,
  address_Province,
  address_City,
  address_Street,
  price,
}
entity House : cuid {
  price   : Decimal;
  address : Address;
}

entity Person {
  key ID   : Integer;
      Name : String(255);
}

entity ComplexTypeEntity {
  key ID         : Integer;
      Name       : String(125);
      Age        : Integer;
      IDCard     : Integer64;
      Weight     : Decimal;
      Height     : Double;
      Active     : Boolean;
      BirthDay   : Date;
      Sign       : DateTime;
      SignTime   : Time;
      SignTmp    : Timestamp;
      GlobalUUID : UUID;
      BlobDoc    : Binary;
}

@cds.materialized.view // create materialized view
@cds.materialized.interval : 1 // refresh internval: per second
view UniqPersonNames as select distinct Name from Person;
