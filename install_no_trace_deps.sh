#!/bin/bash

if [ ! -d "node_modules/@sap/cds" ]; then
  echo "Installing no trace dependencies ...";
  npm i --no-save express @sap/cds@6 sqlite3 @sap/cds-mtxs axios;
fi
