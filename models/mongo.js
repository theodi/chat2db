const { MongoClient } = require('mongodb');

async function runMongoQuery({ uri, dbName }, rawQuery) {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  try {
    const match = rawQuery.match(/db\.([a-zA-Z0-9_]+)\.(find|aggregate|countDocuments)\(([\s\S]*?)\)/);

    if (!match) {
      throw new Error("Could not parse query. Only find(), aggregate(), or countDocuments() supported.");
    }

    const [_, collectionName, method, argsRaw] = match;
    const collection = db.collection(collectionName);

    let result;
    const args = eval(`[${argsRaw}]`); // parse arguments as array

    switch (method) {
      case "find":
        let cursor = collection.find(...args);

        // Handle optional .sort() and .limit() chaining
        if (/\.sort\(([\s\S]*?)\)/.test(rawQuery)) {
          const sortArgs = rawQuery.match(/\.sort\(([\s\S]*?)\)/)[1];
          cursor = cursor.sort(eval(`(${sortArgs})`));
        }
        if (/\.limit\((\d+)\)/.test(rawQuery)) {
          const limitArg = parseInt(rawQuery.match(/\.limit\((\d+)\)/)[1]);
          cursor = cursor.limit(limitArg);
        }

        result = await cursor.toArray();
        break;

      case "aggregate":
        result = await collection.aggregate(...args).toArray();
        break;

      case "countDocuments":
        result = await collection.countDocuments(...args);
        break;

      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    await client.close();
    return { result };
  } catch (err) {
    await client.close();
    return { error: err.message };
  }
}

module.exports = { runMongoQuery };
