# Chat2DB - AI-Powered Database Query System

A comprehensive suite of services that enables natural language interaction with your MongoDB database through multiple interfaces. Built with AI-powered query interpretation, intelligent reasoning, and seamless integration across web and Slack platforms.

---

## Overview

Chat2DB transforms your database into an intelligent, conversational interface. Ask questions in plain English and get insights, visualizations, and actionable data - all powered by AI that understands your data structure and business context.

---

## 🔧 Core Services

### 🧠 **Backend API** (`/`)
- **OpenAI-compatible API** for natural language database queries
- **MongoDB integration** with intelligent query generation
- **Streaming responses** with real-time reasoning and results
- **Chart suggestions** using Chart.js for data visualization
- **Configurable responses** for different use cases and environments

### 🌐 **Web Frontend** (`/frontend`)
- **Assistant UI integration** for rich web-based interactions
- **Real-time streaming** with progressive response display
- **Chart rendering** with interactive visualizations
- **Markdown support** for formatted responses and code highlighting
- **Responsive design** for desktop and mobile use

### 🤖 **Slack Bot** (`/slack-bot`)
- **@mention support** in any Slack channel or private group
- **Direct messaging** for private conversations
- **Threaded conversations** with context preservation
- **Summary-focused responses** optimized for chat interfaces
- **Team collaboration** with shared conversation history

---

## ✨ Key Features

* **AI-Powered Queries**: Natural language to MongoDB query conversion
* **Smart Visualizations**: Automatic chart suggestions and rendering
* **Streaming Responses**: Real-time reasoning and progressive results
* **Configurable Output**: Control response sections and detail levels
* **Security-First**: Database-level access controls and query validation
* **Enterprise Ready**: Compliance guidelines and business context support
* **Unified Launcher**: Start all services with a single command
* **Debug Mode**: Comprehensive logging for development and troubleshooting

---

## Quick Start

### Launch All Services

```bash
# Start everything (Backend + Frontend + Slack Bot)
npm run launch:all

# Or start specific combinations
npm run launch:frontend    # Backend + Web UI
npm run launch:slack       # Backend + Slack Bot
npm run launch:main        # Backend only
```

### Individual Service Setup

Each service can be configured and run independently:

```bash
# Backend API only
npm start

# Web Frontend (requires backend running)
cd frontend && npm run dev

# Slack Bot (requires backend running)
cd slack-bot && npm run dev
```

---

## Installation

### 1. Clone the repo

```bash
git clone <your-repo>
cd <your-repo>
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
  "sampleSize": 5,
  "enableCharts": true,
  "responseSections": {
    "intent": true,
    "reasoning": true,
    "query": true,
    "result": true,
    "summary": true,
    "chartSuggestion": true
  }
}
```

**Fields:**

* `dbType`: only `mongodb` is supported for now
* `mongodb.uri`: your full MongoDB connection string
* `mongodb.dbName`: name of the database to query
* `openai.model`: OpenAI model name (e.g. `gpt-4o`, `gpt-4`, `gpt-3.5-turbo`)
* `sampleSize`: number of documents to sample when describing collections
* `enableCharts`: enable/disable chart suggestions (default: `true`)
* `responseSections`: control which sections appear in responses (see [Response Configuration](#response-configuration))

### 5. System Prompt Setup

The backend automatically generates a system prompt based on your database schema if one isn't present. However, **we strongly recommend tailoring it** for your specific use case.

#### Automatic Generation

If no system prompt exists, the backend will:

1. **Connect to your MongoDB database**
2. **Sample documents** from each collection (using `sampleSize` from config)
3. **Analyze the schema** and field types
4. **Generate a basic prompt** describing the database structure
5. **Save it** to `data/system_prompt.txt`

#### Manual Customization (Recommended)

For best results, customize the generated prompt stored in `data/system_prompt.txt`

**Key areas to customize:**

- **Database description**: Explain what your data represents and its business purpose
- **Field descriptions**: Add business context to fields and their relationships
- **Query examples**: Include common use cases and expected patterns
- **Response guidelines**: Define how the AI should format answers and what tone to use
- **Integration details**: Add links to external systems and cross-platform references
- **Security limitations**: Define banned queries, restricted collections, and access controls
- **Performance constraints**: Set limits on query complexity and result sizes
- **Compliance guidelines**: Add organizational policies, ethical considerations, and data handling rules
- **Business context**: Include industry-specific terminology and domain knowledge

#### Debug Mode

Enable debug mode to see the generated system prompt:

```bash
DEBUG=true npm start
```

You'll see output like:
```
[2024-01-15T10:30:45.123Z] 📋 System prompt loaded
[Generated system prompt content...]
```

---

### 6. Start the server

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

## ⚙️ Response Configuration

Control what sections are included in AI responses through the `responseSections` configuration:

### Available Sections

| Section | Description | Default |
|---------|-------------|---------|
| `intent` | AI's interpretation of user intent | `true` |
| `reasoning` | AI's reasoning process | `true` |
| `query` | Generated MongoDB query | `true` |
| `result` | Raw database results | `true` |
| `summary` | Human-readable summary | `true` |
| `chartSuggestion` | Chart generation suggestions | `true` |

### Common Configurations

#### Production Mode (Minimal Output)
```json
{
  "responseSections": {
    "intent": false,
    "reasoning": false,
    "query": false,
    "result": false,
    "summary": true,
    "chartSuggestion": true
  }
}
```

#### Development Mode (Full Debugging)
```json
{
  "responseSections": {
    "intent": true,
    "reasoning": true,
    "query": true,
    "result": true,
    "summary": true,
    "chartSuggestion": true
  }
}
```

#### Slack Bot Mode (Summary Only)
```json
{
  "responseSections": {
    "intent": false,
    "reasoning": false,
    "query": false,
    "result": false,
    "summary": true,
    "chartSuggestion": true
  }
}
```

For detailed configuration options, see [Response Configuration Documentation](RESPONSE_CONFIG.md).

---

## 🚀 Unified Service Launcher

The project includes a unified launcher that can start multiple services simultaneously:

### Available Presets

| Preset | Services | Use Case |
|--------|----------|----------|
| `main` | Backend API only | API-only deployment |
| `frontend` | Backend + Web UI | Web application |
| `slack` | Backend + Slack Bot | Team collaboration |
| `all` | All services | Complete development setup |

### Configuration

Edit `launcher.config.json` to customize service combinations:

```json
{
  "services": {
    "main": { "enabled": true, "port": 3001 },
    "frontend": { "enabled": true, "port": 3000 },
    "slackBot": { "enabled": true }
  },
  "presets": {
    "production": { "services": ["main"] },
    "development": { "services": ["main", "frontend"] }
  }
}
```

### Usage Examples

```bash
# Development with all services
npm run launch:all

# Production deployment (backend only)
npm run launch:main

# Web application setup
npm run launch:frontend

# Team collaboration setup
npm run launch:slack
```

For detailed launcher documentation, see [Launcher Documentation](LAUNCHER.md).

---

## 🔒 Security and Enforcement

### Database-Level Restrictions

**Important**: Don't rely solely on AI instructions for security. Implement database-level restrictions:

#### MongoDB Access Control
```javascript
// Create restricted user with limited permissions
db.createUser({
  user: "chat2db_user",
  pwd: "secure_password",
  roles: [
    { role: "read", db: "your_database", collection: "contracts" },
    { role: "read", db: "your_database", collection: "organisations" }
    // NO access to users, admin_logs, etc.
  ]
})
```

#### Query Validation Middleware
```javascript
// In your query execution layer
function validateQuery(query) {
  const bannedCollections = ['users', 'admin_logs', 'sensitive_data'];
  const bannedPatterns = [
    /\.find\(\)\.limit\(\d{4,}\)/,
    /\.find\(.*email.*\)/,
    /\.find\(.*phone.*\)/
  ];
  
  // Check for banned collections
  if (bannedCollections.some(col => query.includes(`db.${col}.`))) {
    throw new Error('Access denied: Collection not allowed');
  }
  
  // Check for banned patterns
  if (bannedPatterns.some(pattern => pattern.test(query))) {
    throw new Error('Query pattern not allowed');
  }
  
  return true;
}
```

#### Response Sanitization
```javascript
// Remove sensitive fields from responses
function sanitizeResponse(data) {
  const sensitiveFields = ['email', 'phone', 'ssn', 'password'];
  
  function removeSensitive(obj) {
    if (Array.isArray(obj)) {
      return obj.map(removeSensitive);
    }
    if (obj && typeof obj === 'object') {
      const clean = {};
      for (const [key, value] of Object.entries(obj)) {
        if (!sensitiveFields.includes(key)) {
          clean[key] = removeSensitive(value);
        }
      }
      return clean;
    }
    return obj;
  }
  
  return removeSensitive(data);
}
```

### Configuration-Based Restrictions

Add security settings to your `config.json`:

```json
{
  "security": {
    "bannedCollections": ["users", "admin_logs", "sensitive_data"],
    "maxResultSize": 1000,
    "sensitiveFields": ["email", "phone", "ssn", "password"],
    "requireAggregation": true,
    "allowedQueryPatterns": [
      "db.contracts.find({})",
      "db.contracts.aggregate([...])"
    ]
  }
}
```

---

## How It Works

When a request is sent to `/v1/chat/completions`, the system performs the following steps:

### 1. Classify the Query

The `queryClassifier` uses an OpenAI call to determine if the user's message is:

* A general AI question
* A database-related query (e.g. "What are the top 10 players?")
* A follow-up request for a **chart**

This decision uses the full **system prompt** and conversation history to maintain context.

---

Here's the updated **"Generate an Answer"** section of the `README.md`, rewritten to more clearly reflect the actual logic of `handleUserQueryStreaming` without changing the code:

---

### 2. Generate an Answer (How It Works)

When a user query is sent, the backend performs **step-by-step reasoning** and responds progressively through a streamed interface. Here's how the process works in the `handleUserQueryStreaming` function:

#### Step-by-Step Breakdown

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

### 3. Visualisation Support

If the model suggests a chart:

1. It responds: *"Would you like me to show this as a bar chart?"*
2. If the user agrees, it calls a `chart_generator` service
3. The model generates a valid **Chart.js config**
4. The system formats this into a tool call: `chart_renderer`

This chart config is then rendered on the frontend via Assistant UI.

---

## Testing

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

## Frontend Integration

This backend supports multiple frontend interfaces:

### Assistant UI (Web Frontend)

To use this backend with a graphical chat interface, we recommend pairing it with the [Assistant UI frontend](https://github.com/assistant-ui/assistant-ui).

Follow the full setup guide in the [`frontend/README.md`](../frontend/README.md) to:

* Scaffold the Assistant UI
* Configure it to use this backend
* Enable rich features like markdown responses and Chart.js visualisations

Once connected, you'll be able to stream AI responses, inspect queries, and render database results as interactive charts — all inside a polished web UI.

### Slack Bot Frontend

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