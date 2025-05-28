const config = require('../config.json');
const mongo = require('./mongo');
const mssql = require('./mssql');

async function runQuery(rawQuery) {
  if (config.dbType === 'mongodb') {
    return mongo.runMongoQuery(config.mongodb, rawQuery);
  } else if (config.dbType === 'mssql') {
    return mssql.runSqlQuery(config.mssql, rawQuery);
  } else {
    throw new Error(`Unsupported database type: ${config.dbType}`);
  }
}

module.exports = { runQuery };