const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Uses LLM to determine whether the query requires a DB lookup.
 * @param {Array} messages - Full message history including system prompt.
 * @param {Object} config - Includes OpenAI config.
 * @returns {Promise<boolean>}
 */
async function determineIfDbQuery(messages, config) {
  const prompt = `
You are a classifier. Your job is to decide if the user is asking something that requires querying the database described in the system prompt or whether a general AI response is enough.

Respond only with:
- YES if a database query is required.
- NO if a general AI answer is enough.

Only respond with YES or NO. No other text.

Messages:
${JSON.stringify(messages, null, 2)}
  `.trim();

  const response = await openai.chat.completions.create({
    model: config.openai.model,
    messages: [
      { role: "system", content: "You are a yes/no classifier." },
      { role: "user", content: prompt }
    ],
    temperature: 0
  });

  const decision = response.choices[0].message.content.trim().toUpperCase();
  return decision === "YES";
}

module.exports = { determineIfDbQuery };