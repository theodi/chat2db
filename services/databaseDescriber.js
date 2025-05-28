const { MongoClient } = require("mongodb");
const sql = require("mssql");
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getMongoSamples(uri, dbName, sampleSize = 3) {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const collections = await db.listCollections().toArray();

  const summaries = [];

  for (const col of collections) {
    const docs = await db.collection(col.name).find({}).limit(sampleSize).toArray();
    summaries.push({ name: col.name, sampleDocuments: docs });
  }

  await client.close();
  return summaries;
}

async function getSqlSamples(config, sampleSize = 3) {
  const pool = await sql.connect(config);
  const result = await pool.request()
    .query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'");

  const summaries = [];

  for (const row of result.recordset) {
    const tableName = row.TABLE_NAME;
    const sample = await pool.request()
      .query(`SELECT TOP (${sampleSize}) * FROM [${tableName}]`);
    summaries.push({ name: tableName, sampleRows: sample.recordset });
  }

  sql.close();
  return summaries;
}

/**
 * Describe the database to produce a system prompt using OpenAI
 */
async function describeDatabase(config) {
  const sampleSize = config.sampleSize || 3;
  let samples;

  if (config.dbType === "mongodb") {
    samples = await getMongoSamples(config.mongodb.uri, config.mongodb.dbName, sampleSize);
  } else if (config.dbType === "mssql") {
    samples = await getSqlSamples(config.mssql, sampleSize);
  } else {
    throw new Error("Unsupported database type for description.");
  }

  const prompt = `
You are an assistant analysing the structure of a ${config.dbType} database.

Your tasks:
1. Summarise what this database appears to represent.
2. List each collection/table and the fields/columns it contains.
3. Suggest what a user might be able to ask about this data.

Samples:
${JSON.stringify(samples, null, 2)}
`;

  const response = await openai.chat.completions.create({
    model: config.openai.model,
    messages: [
      { role: "system", content: "You are a data analysis assistant." },
      { role: "user", content: prompt }
    ],
    temperature: 0.2
  });

  return response.choices[0].message.content;
}

module.exports = { describeDatabase };