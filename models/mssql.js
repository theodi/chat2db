const sql = require('mssql');

async function runSqlQuery(config, rawQuery) {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(rawQuery);
    return { result: result.recordset };
  } catch (err) {
    return { error: err.message };
  } finally {
    sql.close();
  }
}

module.exports = { runSqlQuery };