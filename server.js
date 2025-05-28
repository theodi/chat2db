require("dotenv").config({ path: require('path').resolve(__dirname, '.env') });
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const { setupSystemPrompt, getSystemPrompt } = require("./services/setupSystemPrompt");

const completionsRoute = require("./routes/completions");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/v1/chat/completions", completionsRoute);

app.get("/", (req, res) => {
  res.send("GenAI DB Assistant API is running.");
});

// 🔄 Startup: load/generate system prompt
setupSystemPrompt().then(() => {
  console.log(getSystemPrompt());
  app.listen(PORT, () => {
    console.log(`🚀 Backend API running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("❌ Failed to initialise system prompt:", err);
});