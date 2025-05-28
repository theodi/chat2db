const fs = require("fs");
const path = require("path");
const { describeDatabase } = require("./databaseDescriber");

const config = require("../config.json");
const promptPath = path.join(__dirname, "../data/system_prompt.txt");

let systemPrompt = null;

async function setupSystemPrompt() {
  if (fs.existsSync(promptPath)) {
    systemPrompt = fs.readFileSync(promptPath, "utf-8");
  } else {
    console.log("🔍 Generating system prompt from database...");
    systemPrompt = await describeDatabase(config);
    fs.writeFileSync(promptPath, systemPrompt, "utf-8");
  }

  return systemPrompt;
}

function getSystemPrompt() {
  return systemPrompt;
}

module.exports = { setupSystemPrompt, getSystemPrompt };