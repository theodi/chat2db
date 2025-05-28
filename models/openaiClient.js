require("dotenv").config();
const { OpenAI } = require("openai");
const { z } = require("zod");
const { zodResponseFormat } = require("openai/helpers/zod");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define structure of AI interpretation
const QuerySchema = z.object({
  intent: z.string(),
  query: z.string(),
  reasoning: z.string()
});

/**
 * Ask OpenAI to interpret a user's natural language query
 */
async function interpretQuery(conversation, userQuery, modelConfig) {
  const messages = [...conversation];
  messages.push({ role: "user", content: userQuery });

  const response = await openai.beta.chat.completions.parse({
    model: modelConfig.model,
    messages,
    temperature: modelConfig.temperature || 0.3,
    response_format: zodResponseFormat(QuerySchema, "query"),
  });

  return JSON.parse(response.choices[0].message.content);
}

/**
 * Summarise the result of a query in natural language
 */
async function summariseResult({ userQuery, rawQuery, resultData, systemPrompt }, model) {
  const prompt = `
You are an assistant helping users understand data.

User question: ${userQuery}
Query executed: ${rawQuery}
Raw result: ${JSON.stringify(resultData, null, 2)}

Analyse if the result is relevant to the user question. If it is only summarise the result for the user, do not explain what the query was or the result of your analysis. If the result does not answer the user question, explain what the result was and why it did not answer the user question.
`;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    temperature: 0.3,
  });

  return response.choices[0].message.content;
}

module.exports = { interpretQuery, summariseResult };