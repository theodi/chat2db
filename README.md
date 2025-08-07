# 🧠 AI Query Backend (MongoDB + OpenAI-Compatible API)

This backend exposes an OpenAI-compatible `/v1/chat/completions` API that intelligently answers user queries using MongoDB data. It's designed to work seamlessly with [Assistant UI](https://github.com/assistant-ui/assistant-ui) and supports natural language querying, reasoning, and chart generation via Chart.js.

---

## 🔧 Features

* 🧠 Powered by OpenAI (e.g. `gpt-4o`)
* 🗃️ Answers queries using your MongoDB collection
* 📊 Suggests and renders charts using Chart.js
* 🧵 Fully compatible with streaming and non-streaming conversations
* ✅ Supports Assistant UI's `/v1/chat/completions` endpoint

---

## 🚀 Installation

### 1. Clone the repo

```bash
git clone <your-backend-repo>
cd <your-backend-repo>
```

---

### 2. Install dependencies

```bash
npm install
```

---

### 3. Set up environment variables

Create a `.env` file:

```bash
touch .env
```

Add your OpenAI API key (for chart reasoning and language understanding):

```
OPENAI_API_KEY=sk-...
```

---

### 4. Create a `config.json` file

Configure the backend to point to your MongoDB instance and preferred OpenAI model. Example:

```json
{
  "dbType": "mongodb",
  "mongodb": {
    "uri": "mongodb+srv://user:password@location/db",
    "dbName": "db"
  },
  "openai": {
    "model": "gpt-4o"
  },
  "sampleSize": 5
}
```

**Fields:**

* `dbType`: only `mongodb` is supported for now
* `mongodb.uri`: your full MongoDB connection string
* `mongodb.dbName`: name of the database to query
* `openai.model`: OpenAI model name (e.g. `gpt-4o`, `gpt-4`, `gpt-3.5-turbo`)
* `sampleSize`: number of documents to sample when describing collections

---

### 5. Start the server

#### Production Mode
```bash
npm start
# or
node server.js
```

#### Development Mode (with Debug Logging)
```bash
npm run dev
# or
npm run debug
```

The backend runs on port `3001` by default and exposes the following route:

```
POST /v1/chat/completions
```

---

## 🔧 Debug Mode

The application includes a comprehensive debug mode that provides detailed logging for development and troubleshooting.

### Enabling Debug Mode

**Option 1: Using npm scripts**
```bash
npm run dev      # Sets DEBUG=true
npm run debug    # Sets DEBUG=true and NODE_ENV=development
```

**Option 2: Using environment variables**
```bash
DEBUG=true node server.js
DEBUG=true NODE_ENV=development node server.js
```

### Debug Features

When debug mode is enabled, you'll see:

- **🔍 Query Processing**: Detailed logging of user queries and AI interpretations
- **📊 Database Operations**: MongoDB query parsing, validation, and execution details
- **🧠 AI Interactions**: OpenAI API calls and responses
- **📈 Chart Operations**: Chart suggestion logic and processing
- **⚠️ Error Handling**: Detailed error messages with context
- **⏱️ Timestamps**: All debug messages include timestamps

### Debug Output Example

```
[2024-01-15T10:30:45.123Z] 🧠 User query: Any relevant opportunities in added in the last week?
[2024-01-15T10:30:45.124Z] 🔍 Full raw query: db.contracts.find({createdAt: {$gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}, "aiRating.score": {$gte: 8}})
[2024-01-15T10:30:45.125Z] 🔍 Extracted query components: {collection: "contracts", method: "find", argsRaw: "{createdAt: {$gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}, "aiRating.score": {$gte: 8}}", argsLength: 89}
[2024-01-15T10:30:45.126Z] 🔍 MongoDB query debug: {collection: "contracts", method: "find", args: [{createdAt: {$gte: 2024-01-08T10:30:45.126Z}, "aiRating.score": {$gte: 8}}], argsType: "object", argsLength: 1}
[2024-01-15T10:30:45.127Z] 🔍 Find result: {resultType: "object", isArray: true, length: 5}
```

---

---

## 🤖 How It Works

When a request is sent to `/v1/chat/completions`, the system performs the following steps:

### 🔍 1. Classify the Query

The `queryClassifier` uses an OpenAI call to determine if the user's message is:

* A general AI question
* A database-related query (e.g. "What are the top 10 players?")
* A follow-up request for a **chart**

This decision uses the full **system prompt** and conversation history to maintain context.

---

Here's the updated **"Generate an Answer"** section of the `README.md`, rewritten to more clearly reflect the actual logic of `handleUserQueryStreaming` without changing the code:

---

### 🧠 2. Generate an Answer (How It Works)

When a user query is sent, the backend performs **step-by-step reasoning** and responds progressively through a streamed interface. Here's how the process works in the `handleUserQueryStreaming` function:

#### ✅ Step-by-Step Breakdown

1. **Interpret the Intent**
   The system uses `interpretQuery` to ask the AI to determine:

   * The user's intent (e.g. analysis, comparison, listing)
   * The MongoDB query to run
   * A natural language reasoning explanation

   These are sent as early streaming chunks:

   ````
   **Intent:** analysis
   **Reasoning:** The user wants to compare totals by category.
   **Query:**
   ```js
   db.collection.aggregate([...])
   ````

   ```
   ```

2. **Run the MongoDB Query**
   The backend executes the AI-generated query using `runQuery`.

   * If the query fails, the error is streamed back immediately.
   * If it succeeds, the full result is streamed as formatted JSON.

3. **Summarise the Result**
   The system then calls `summariseResult` to generate a clear, user-facing explanation of the output. This summary is streamed back as plain text.

4. **Check for Chart Options**
   Based on the query and data, the system uses `getChartType` to determine if a chart would help visualise the result.

   * If appropriate, it suggests a chart to the user in natural language:

     ```
     Would you like me to show this result as a bar chart?
     ```

5. **Cache the Result for Follow-up**
   The raw query, results, and suggested chart type are cached using `setLastResult()`, enabling the user to follow up (e.g. "Yes please") and trigger chart rendering later.

6. **Streaming Ends**
   The system closes the stream with a stop signal, as expected by OpenAI-compatible clients.

---

This clear, conversational response cycle makes the backend ideal for use in an interactive chat environment, progressively showing reasoning, results, and visual options without overwhelming the user.

### 📊 3. Visualisation Support

If the model suggests a chart:

1. It responds: *"Would you like me to show this as a bar chart?"*
2. If the user agrees, it calls a `chart_generator` service
3. The model generates a valid **Chart.js config**
4. The system formats this into a tool call: `chart_renderer`

This chart config is then rendered on the frontend via Assistant UI.

---

## 🧪 Testing

You can test the API directly with `curl` or Postman:

```bash
curl http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      { "role": "user", "content": "Show me the top 5 products by sales" }
    ],
    "stream": false
  }'
```

---

## 🔗 Frontend Integration

This backend supports multiple frontend interfaces:

### 🌐 Assistant UI (Web Frontend)

To use this backend with a graphical chat interface, we recommend pairing it with the [Assistant UI frontend](https://github.com/assistant-ui/assistant-ui).

Follow the full setup guide in the [`frontend/README.md`](../frontend/README.md) to:

* Scaffold the Assistant UI
* Configure it to use this backend
* Enable rich features like markdown responses and Chart.js visualisations

Once connected, you'll be able to stream AI responses, inspect queries, and render database results as interactive charts — all inside a polished web UI.

### 🤖 Slack Bot Frontend

For team collaboration, you can use the Slack bot frontend that allows querying the database directly from Slack channels and direct messages.

Follow the setup guide in the [`slack-bot/README.md`](../slack-bot/README.md) to:

* Configure the Slack bot
* Set up Slack app permissions
* Enable @mention support and threaded conversations

The Slack bot supports:
* @mention queries in any channel (including private channels)
* Direct message conversations
* Follow-up questions in threads
* Chart generation requests