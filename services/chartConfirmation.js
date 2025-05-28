const { z } = require("zod");
const OpenAI = require("openai");

async function isChartConfirmation(conversation, config) {
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
      { role: "system", content: "You determine if the user has confirmed they'd like a chart." },
      { role: "user", content: prompt }
    ]
  });

  try {
    const json = JSON.parse(response.choices[0].message.content);
    return json.confirmChart === true;
  } catch (err) {
    console.error("Chart confirmation detection failed:", err.message);
    return false;
  }
}

module.exports = { isChartConfirmation };