const { MongoClient } = require('mongodb');
const { debugLog, debugError, debugWarn, debugInfo } = require('../utils/debug');

function validateMongoQuery(rawQuery) {
  // Check for basic MongoDB query structure
  const basicPattern = /^db\.([a-zA-Z0-9_]+)\.(find|aggregate|countDocuments)\(/;
  if (!basicPattern.test(rawQuery)) {
    throw new Error("Invalid query format. Must start with db.collection.method(");
  }

  // Check for balanced parentheses
  let parenCount = 0;
  for (let char of rawQuery) {
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (parenCount < 0) {
      throw new Error("Unbalanced parentheses in query");
    }
  }
  if (parenCount !== 0) {
    throw new Error("Unbalanced parentheses in query");
  }

  // Check for common syntax errors
  if (rawQuery.includes(',,') || rawQuery.includes('{,') || rawQuery.includes(',}')) {
    throw new Error("Invalid comma placement in query");
  }

  // Check for unclosed quotes
  const singleQuotes = (rawQuery.match(/'/g) || []).length;
  const doubleQuotes = (rawQuery.match(/"/g) || []).length;
  if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
    throw new Error("Unclosed quotes in query");
  }

  // Check for problematic date expressions that might cause eval issues
  if (rawQuery.includes('new Date().setDate(')) {
    debugWarn("⚠️", "Complex date expression detected - this might cause eval issues");
  }

  return true;
}

async function runMongoQuery({ uri, dbName }, rawQuery) {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  try {
    debugLog("🔍", "Full raw query:", rawQuery);
    
    // Validate query syntax before parsing
    try {
      validateMongoQuery(rawQuery);
    } catch (validationError) {
      debugError("❌", "Query validation failed:", validationError.message);
      debugError("❌", "Raw query:", rawQuery);
      throw new Error(`Query validation failed: ${validationError.message}`);
    }
    
    // Parse the query with proper handling of nested parentheses
    const basicMatch = rawQuery.match(/db\.([a-zA-Z0-9_]+)\.(find|aggregate|countDocuments)\(/);
    
    if (!basicMatch) {
      debugError("❌", "Query parsing failed - no match found");
      debugError("❌", "Raw query:", rawQuery);
      throw new Error("Could not parse query. Only find(), aggregate(), or countDocuments() supported.");
    }

    const [_, collectionName, method] = basicMatch;
    
    // Extract arguments by finding the matching closing parenthesis
    const openParenIndex = rawQuery.indexOf('(');
    let parenCount = 0;
    let closeParenIndex = -1;
    
    for (let i = openParenIndex; i < rawQuery.length; i++) {
      if (rawQuery[i] === '(') {
        parenCount++;
      } else if (rawQuery[i] === ')') {
        parenCount--;
        if (parenCount === 0) {
          closeParenIndex = i;
          break;
        }
      }
    }
    
    if (closeParenIndex === -1) {
      throw new Error("Could not find matching closing parenthesis");
    }
    
    const argsRaw = rawQuery.substring(openParenIndex + 1, closeParenIndex);
    
    debugLog("🔍", "Extracted query components:", {
      collection: collectionName,
      method: method,
      argsRaw: argsRaw,
      argsLength: argsRaw.length
    });
    
    const collection = db.collection(collectionName);

    let result;
    
    debugLog("🔍", "Raw query args:", argsRaw);
    
    let args;
    try {
      // Pre-process complex date expressions to avoid eval issues
      let processedArgs = argsRaw;
      
      // Replace problematic date expressions with safer alternatives
      if (processedArgs.includes('new Date().setDate(')) {
        debugLog("🔧", "Processing complex date expression...");
        // Replace new Date().setDate(new Date().getDate() - 7) with a safer expression
        processedArgs = processedArgs.replace(
          /new Date\(\)\.setDate\(new Date\(\)\.getDate\(\) - (\d+)\)/g,
          'new Date(Date.now() - $1 * 24 * 60 * 60 * 1000)'
        );
        debugLog("🔧", "Processed args:", processedArgs);
      }
      debugLog("🔧", "Processed args:", processedArgs);
      args = eval(`[${processedArgs}]`); // parse arguments as array
    } catch (evalError) {
      debugError("❌", "Failed to parse query arguments:", evalError.message);
      debugError("❌", "Raw args that failed:", argsRaw);
      throw new Error(`Query parsing failed: ${evalError.message}. Raw args: ${argsRaw}`);
    }

    debugLog("🔍", "MongoDB query debug:", {
      collection: collectionName,
      method: method,
      args: args,
      argsType: typeof args,
      argsLength: Array.isArray(args) ? args.length : 'N/A'
    });

    switch (method) {
      case "find":
        let cursor = collection.find(...args);

        // Handle optional .sort() and .limit() chaining
        if (/\.sort\(([\s\S]*?)\)/.test(rawQuery)) {
          const sortArgs = rawQuery.match(/\.sort\(([\s\S]*?)\)/)[1];
          debugLog("🔍", "Sort args:", sortArgs);
          try {
            cursor = cursor.sort(eval(`(${sortArgs})`));
          } catch (sortError) {
            debugError("❌", "Failed to parse sort arguments:", sortError.message);
            debugError("❌", "Sort args that failed:", sortArgs);
            throw new Error(`Sort parsing failed: ${sortError.message}. Sort args: ${sortArgs}`);
          }
        }
        if (/\.limit\((\d+)\)/.test(rawQuery)) {
          const limitArg = parseInt(rawQuery.match(/\.limit\((\d+)\)/)[1]);
          debugLog("🔍", "Limit arg:", limitArg);
          cursor = cursor.limit(limitArg);
        }

        result = await cursor.toArray();
        debugLog("🔍", "Find result:", {
          resultType: typeof result,
          isArray: Array.isArray(result),
          length: Array.isArray(result) ? result.length : 'N/A'
        });
        break;

      case "aggregate":
        result = await collection.aggregate(...args).toArray();
        debugLog("🔍", "Aggregate result:", {
          resultType: typeof result,
          isArray: Array.isArray(result),
          length: Array.isArray(result) ? result.length : 'N/A'
        });
        break;

      case "countDocuments":
        result = await collection.countDocuments(...args);
        debugLog("🔍", "CountDocuments result:", {
          resultType: typeof result,
          resultValue: result
        });
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
