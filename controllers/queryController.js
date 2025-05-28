const { interpretQuery, summariseResult } = require("../models/openaiClient");
const { runQuery } = require("../models/database");
const { setLastResult } = require("../services/sessionCache");
const { getChartType } = require("../services/chartAdvisor");

async function handleUserQuery(userQuery, conversation, config) {
  try {
    console.log("🧠 User query:", userQuery);

    const interpretation = await interpretQuery(conversation, userQuery, config.openai);
    const { intent, query, reasoning } = interpretation;

    const dbResponse = await runQuery(query);
    if (dbResponse.error) {
      return {
        interpretation,
        dbResult: null,
        summary: null,
        error: `Database error: ${dbResponse.error}`
      };
    }

    const summary = await summariseResult({
      userQuery,
      rawQuery: query,
      resultData: dbResponse.result,
      systemPrompt: conversation[0].content
    }, config.openai.model);

    let chartSuggestion = '';
    const chartType = await getChartType(query, dbResponse.result, config);
    if (chartType) {
      chartSuggestion = `\n\nWould you like me to show this result as a ${chartType} chart?`;
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
    console.error("💥 handleUserQuery error:", err.message);
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

  try {
    console.log("🧠 User query:", userQuery);

    const interpretation = await interpretQuery(conversation, userQuery, config.openai);
    const { intent, query, reasoning } = interpretation;

    sendChunk(`**Intent:** ${intent}\n`);
    sendChunk(`**Reasoning:** ${reasoning}\n\n`);
    sendChunk("**Query:**\n```js\n" + query + "\n```\n\n");

    const dbResponse = await runQuery(query);

    if (dbResponse.error) {
      sendChunk("❌ **Database error:** " + dbResponse.error + "\n");
      endStream();
      return;
    }

    const rawResult = JSON.stringify(dbResponse.result, null, 2);
    sendChunk("**Result:**\n```json\n" + rawResult + "\n```\n\n");

    const summary = await summariseResult({
      userQuery,
      rawQuery: query,
      resultData: dbResponse.result,
      systemPrompt: conversation[0].content
    }, config.openai.model);

    sendChunk("**Summary:**\n" + summary + "\n");

    const chartType = await getChartType(query, dbResponse.result, config);
    if (chartType && chartType !== "none") {
      sendChunk(`\nWould you like me to show this result as a ${chartType} chart?\n`);
    }

    setLastResult({ rawQuery: query, dbResult: dbResponse.result, chartType });

    endStream();
  } catch (err) {
    console.error("💥 Streaming error:", err.message);
    sendChunk("❌ Error: " + err.message + "\n");
    endStream();
  }
}

module.exports = { handleUserQuery, handleUserQueryStreaming };