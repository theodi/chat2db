const OpenAI = require("openai");

async function generateChart(userQuery, resultData, chartType, config) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `
You are a Chart.js assistant.

The user asked: "${userQuery}"
You previously recommended a "${chartType}" chart.
Here is the data to chart:
${JSON.stringify(resultData)}

Now generate a valid JSON configuration for a Chart.js chart of type "${chartType}" using the data. Ensure it includes labels and at least one dataset.

Respond with **only** the JSON object for the chart configuration.
`;

  const response = await openai.chat.completions.create({
    model: config.openai.model,
    messages: [
      { role: "system", content: "You are a Chart.js generator that outputs only JSON configs." },
      { role: "user", content: prompt }
    ],
    temperature: 0.3
  });
  return response.choices[0].message.content.trim();
}

module.exports = { generateChart };