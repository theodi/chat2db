const OpenAI = require("openai");

async function getChartType(userQuery, resultData, config) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `
You are a chart advisor.

The user asked: "${userQuery}"
Here is a sample of the result data:
${JSON.stringify(resultData.slice(0, 3), null, 2)}

Does this data lend itself to a visual representation? If so, recommend one of the following chart types: "bar", "line", "pie", "scatter", or "none".

Respond with a single word: the chart type or "none".
`;

  const response = await openai.chat.completions.create({
    model: config.openai.model,
    messages: [
      { role: "system", content: "You are a data visualisation assistant." },
      { role: "user", content: prompt }
    ],
    temperature: 0
  });

  return response.choices[0].message.content.trim().toLowerCase();
}

module.exports = { getChartType };