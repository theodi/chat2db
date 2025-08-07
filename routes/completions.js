const express = require("express");
const router = express.Router();
const config = require("../config.json");

const { handleUserQuery, handleUserQueryStreaming } = require("../controllers/queryController");
const { getSystemPrompt } = require("../services/setupSystemPrompt");
const { determineIfDbQuery } = require("../services/queryClassifier");
const { isChartConfirmation } = require("../services/chartConfirmation");
const { generateChart } = require("../services/chartGenerator");
const { getLastResult } = require("../services/sessionCache");
const { debugLog, debugError, debugWarn, debugInfo } = require("../utils/debug");

const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", async (req, res) => {
  const { messages, model, stream = false } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: { message: "Missing 'messages' array" } });
  }

  const lastUserMessage = messages.filter(m => m.role === "user").pop();
  if (!lastUserMessage) {
    return res.status(400).json({ error: { message: "No user message found." } });
  }

  const systemPrompt = `${getSystemPrompt() || "You are a helpful assistant."}\nThis is a ${config.dbType} database.`;
  const hasSystem = messages.some(m => m.role === "system");
  const fullConversation = hasSystem ? messages : [{ role: "system", content: systemPrompt }, ...messages];

  function sendChunk(content) {
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content }, index: 0 }] })}\n\n`);
  }

  try {
    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      sendChunk("🤔 Thinking...\n\n");
    }

    // 📊 Handle chart confirmations
    const last = getLastResult();
    
    // Only check for chart confirmation if we have a last result and charts are enabled
    let wantsChart = false;
    debugLog("🔍", "Chart confirmation check:", {
      hasLastResult: !!last,
      hasDbResult: !!last?.dbResult,
      enableCharts: config.enableCharts,
      lastUserMessage: lastUserMessage.content
    });
    
    if (last?.dbResult && config.enableCharts !== false) {
      wantsChart = await isChartConfirmation(fullConversation, config);
      debugLog("📊", "Chart confirmation result:", wantsChart);
    } else {
      debugLog("📊", "Chart confirmation skipped - no last result or charts disabled");
    }

   if (wantsChart && last?.dbResult) {
    debugLog("🔍", "User confirmed they want a chart based on last result:", last);
    const chartType = last.chartType;
    let chartJsConfig = await generateChart(last.rawQuery, last.dbResult, chartType, config);

    // Clean up response to remove any markdown formatting
    chartJsConfig = chartJsConfig.trim();
    if (chartJsConfig.startsWith("```")) {
      chartJsConfig = chartJsConfig.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
    }

    let parsedConfig;
    try {
      parsedConfig = JSON.parse(chartJsConfig);
    } catch (e) {
      debugError("❌", "Failed to parse Chart.js config:", e.message);
      return res.status(500).json({ error: { message: "Invalid Chart.js config generated." } });
    }

    const toolCall = {
      index: 0,
      id: "tool_call_chart_1",
      type: "function",
      function: {
        name: "chart_renderer",
        arguments: JSON.stringify({
          type: chartType,
          data: parsedConfig.data,
          options: parsedConfig.options || {}
        })
      }
    };

    if (stream) {
      // Send tool call as a single SSE message
      const toolChunk = {
        choices: [
          {
            delta: {
              tool_calls: [toolCall]
            },
            index: 0
          }
        ]
      };
      debugLog("📊", "Sending chart tool call:", JSON.stringify(toolChunk));
      res.write(`data: ${JSON.stringify(toolChunk)}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    } else {
      return res.json({
        id: `chatcmpl-${Math.random().toString(36).substring(2)}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: model || config.openai.model,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: null, // no plain text
              tool_calls: [toolCall]
            },
            finish_reason: "stop"
          }
        ]
      });
    }
  }
  } catch (err) {
    debugError("💥", "Completion route error:", err);
    res.status(500).json({ error: { message: err.message } });
  }

  try {

    const needsDb = await determineIfDbQuery(fullConversation, config);

    // 💬 Handle database queries
    if (needsDb) {
      if (stream) {
        return handleUserQueryStreaming(lastUserMessage.content, fullConversation, config, res);
      } else {
        const result = await handleUserQuery(lastUserMessage.content, fullConversation, config);
        if (result.error) {
          return res.status(500).json({ error: { message: result.error } });
        }

        return res.json({
          id: `chatcmpl-${Math.random().toString(36).substring(2)}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: model || config.openai.model,
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: result.summary },
              finish_reason: "stop"
            }
          ]
        });
      }
    }


    // 🤖 Default plain LLM response
    const response = await openai.chat.completions.create({
      model: model || config.openai.model,
      messages: fullConversation,
      temperature: config.openai.temperature || 0.3
    });

    const responseText = response.choices[0].message.content;

    if (stream) {
      const words = responseText.split(" ");
      for (const word of words) {
        const chunk = {
          choices: [{ delta: { content: word + " " }, index: 0 }]
        };
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        await new Promise(r => setTimeout(r, 20));
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } else {
      res.json({
        id: `chatcmpl-${Math.random().toString(36).substring(2)}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: model || config.openai.model,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: responseText },
            finish_reason: "stop"
          }
        ]
      });
    }
  } catch (err) {
    debugError("💥", "Completion route error:", err);
    res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;