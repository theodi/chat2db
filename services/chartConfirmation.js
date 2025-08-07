const { z } = require("zod");
const OpenAI = require("openai");

async function isChartConfirmation(conversation, config) {
  // Skip chart confirmation if charts are disabled
  if (config.enableCharts === false) {
    console.log("📊 Chart confirmation skipped - charts disabled");
    return false;
  }

  const prompt = `
Based on the following conversation, is the user confirming they want to see a chart in their last message? Only consider their last message and not what as gone before. Respond only with JSON:

{ "confirmChart": true }

or

{ "confirmChart": false }

Conversation:
${JSON.stringify(conversation, null, 2)}
`;

  const OpenAI = require("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: config.openai.model,
    messages: [
      { role: "system", content: "You determine if the user has confirmed they'd like a chart. Respond only with valid JSON." },
      { role: "user", content: prompt }
    ],
    temperature: 0
  });

  try {
    let content = response.choices[0].message.content.trim();
    
    // Clean up markdown code blocks if present
    if (content.startsWith("```json")) {
      content = content.replace(/^```json\s*/, "").replace(/```$/, "").trim();
    } else if (content.startsWith("```")) {
      content = content.replace(/^```\s*/, "").replace(/```$/, "").trim();
    }
    
    const json = JSON.parse(content);
    return json.confirmChart === true;
  } catch (err) {
    console.error("Chart confirmation detection failed:", err.message, "Raw response:", response.choices[0].message.content);
    return false;
  }
}

module.exports = { isChartConfirmation };