const { interpretQuery, summariseResult } = require("../models/openaiClient");
const { runQuery } = require("../models/database");
const { setLastResult } = require("../services/sessionCache");
const { getChartType } = require("../services/chartAdvisor");
const { debugLog, debugError, debugWarn, debugInfo } = require("../utils/debug");

async function handleUserQuery(userQuery, conversation, config) {
  // Get response section configuration with defaults
  const responseConfig = config.responseSections || {
    intent: true,
    reasoning: true,
    query: true,
    result: true,
    summary: true,
    chartSuggestion: true
  };

  try {
    debugLog("🧠", "User query:", userQuery);
    debugLog("⚙️", "Response sections config:", responseConfig);

    const interpretation = await interpretQuery(conversation, userQuery, config.openai);
    const { intent, query, reasoning } = interpretation;

    const dbResponse = await runQuery(query);
    
    // Debug logging for empty results
    debugLog("🔍", "Database response:", {
      hasResult: !!dbResponse.result,
      resultType: typeof dbResponse.result,
      isArray: Array.isArray(dbResponse.result),
      length: Array.isArray(dbResponse.result) ? dbResponse.result.length : 'N/A',
      isEmpty: Array.isArray(dbResponse.result) ? dbResponse.result.length === 0 : false
    });
    
    if (dbResponse.error) {
      return {
        interpretation,
        dbResult: null,
        summary: null,
        error: `Database error: ${dbResponse.error}`
      };
    }

    // Handle empty results gracefully
    if (!dbResponse.result) {
      return {
        interpretation,
        dbResult: null,
        summary: "No result returned from database",
        error: null
      };
    }

    if (Array.isArray(dbResponse.result) && dbResponse.result.length === 0) {
      return {
        interpretation,
        dbResult: [],
        summary: "No matching records found. The query executed successfully but returned no results. This could mean the data doesn't contain records for the specified parameters, or you may need to broaden your search criteria.",
        error: null
      };
    }

    const summary = await summariseResult({
      userQuery,
      rawQuery: query,
      resultData: dbResponse.result,
      systemPrompt: conversation[0].content
    }, config.openai.model);

    let chartSuggestion = '';
    let chartType = null;
    
    // Only check for chart suggestions if charts are enabled and we have results
    if (config.enableCharts !== false && dbResponse.result && Array.isArray(dbResponse.result) && dbResponse.result.length > 0) {
      chartType = await getChartType(query, dbResponse.result, config);
      if (chartType && chartType !== 'none' && responseConfig.chartSuggestion) {
        chartSuggestion = `\n\nWould you like me to show this result as a ${chartType} chart?`;
      }
    } else {
      debugLog("📊", "Chart check skipped:", {
        enableCharts: config.enableCharts,
        hasResult: !!dbResponse.result,
        isArray: Array.isArray(dbResponse.result),
        length: Array.isArray(dbResponse.result) ? dbResponse.result.length : 'N/A'
      });
    }

    // Cache for follow-up chart confirmation
    setLastResult({ rawQuery: query, dbResult: dbResponse.result, chartType });

    return {
      interpretation,
      dbResult: dbResponse.result,
      summary: summary + chartSuggestion,
      error: null
    };
  } catch (err) {
    debugError("💥", "handleUserQuery error:", err.message);
    return { interpretation: null, dbResult: null, summary: null, error: err.message };
  }
}

async function handleUserQueryStreaming(userQuery, conversation, config, res) {

  function sendChunk(content) {
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content }, index: 0 }] })}\n\n`);
  }

  function endStream() {
    res.write(`data: ${JSON.stringify({ choices: [{ delta: {}, index: 0, finish_reason: "stop" }] })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }

  // Get response section configuration with defaults
  const responseConfig = config.responseSections || {
    intent: true,
    reasoning: true,
    query: true,
    result: true,
    summary: true,
    chartSuggestion: true
  };

  try {
    debugLog("🧠", "User query:", userQuery);
    debugLog("⚙️", "Response sections config:", responseConfig);

    const interpretation = await interpretQuery(conversation, userQuery, config.openai);
    const { intent, query, reasoning } = interpretation;

    // Send intent section if enabled
    if (responseConfig.intent) {
      sendChunk(`**Intent:** ${intent}\n\n`);
    }

    // Send reasoning section if enabled
    if (responseConfig.reasoning) {
      sendChunk(`**Reasoning:** ${reasoning}\n\n`);
    }

    // Send query section if enabled
    if (responseConfig.query) {
      sendChunk("**Query:**\n```js\n" + query + "\n```\n\n");
    }

    const dbResponse = await runQuery(query);

    if (dbResponse.error) {
      sendChunk("❌ **Database error:** " + dbResponse.error + "\n");
      endStream();
      return;
    }

    // Debug logging for empty results
    debugLog("🔍", "Database response:", {
      hasResult: !!dbResponse.result,
      resultType: typeof dbResponse.result,
      isArray: Array.isArray(dbResponse.result),
      length: Array.isArray(dbResponse.result) ? dbResponse.result.length : 'N/A',
      isEmpty: Array.isArray(dbResponse.result) ? dbResponse.result.length === 0 : false
    });

    // Handle empty results gracefully
    if (!dbResponse.result) {
      sendChunk("❌ **No result returned from database**\n");
      endStream();
      return;
    }

    if (Array.isArray(dbResponse.result) && dbResponse.result.length === 0) {
      sendChunk("📭 **No matching records found**\n\n");
      sendChunk("The query executed successfully but returned no results. This could mean:\n");
      sendChunk("- The data doesn't contain records for the specified parameters\n");
      sendChunk("- Try broadening your search criteria or checking the data availability\n\n");
      
      // Still show the query for debugging if enabled
      if (responseConfig.query) {
        sendChunk("**Query executed:**\n```js\n" + query + "\n```\n\n");
      }
      endStream();
      return;
    }

    // Send result section if enabled
    if (responseConfig.result) {
      const rawResult = JSON.stringify(dbResponse.result, null, 2);
      sendChunk("**Result:**\n```json\n" + rawResult + "\n```\n\n");
    }

    const summary = await summariseResult({
      userQuery,
      rawQuery: query,
      resultData: dbResponse.result,
      systemPrompt: conversation[0].content
    }, config.openai.model);

    // Send summary section if enabled
    if (responseConfig.summary) {
      sendChunk("**Summary:**\n" + summary + "\n\n");
    }

    // Only check for chart suggestions if charts are enabled and we have results
    let chartType = null;
    if (config.enableCharts !== false && dbResponse.result && Array.isArray(dbResponse.result) && dbResponse.result.length > 0) {
      chartType = await getChartType(query, dbResponse.result, config);
      if (chartType && chartType !== "none" && responseConfig.chartSuggestion) {
        sendChunk(`Would you like me to show this result as a ${chartType} chart?\n`);
      }
    } else {
      debugLog("📊", "Chart check skipped (streaming):", {
        enableCharts: config.enableCharts,
        hasResult: !!dbResponse.result,
        isArray: Array.isArray(dbResponse.result),
        length: Array.isArray(dbResponse.result) ? dbResponse.result.length : 'N/A'
      });
    }

    setLastResult({ rawQuery: query, dbResult: dbResponse.result, chartType });

    endStream();
  } catch (err) {
    debugError("💥", "Streaming error:", err.message);
    sendChunk("❌ Error: " + err.message + "\n");
    endStream();
  }
}

module.exports = { handleUserQuery, handleUserQueryStreaming };