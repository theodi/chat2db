# 🤖 Chat2DB Slack Bot

A Slack bot frontend for the Chat2DB application that allows users to query databases through natural language conversations in Slack channels and direct messages.

## ✨ Features

- **@mention Support**: Mention the bot in any channel (including private channels) to ask database questions
- **Thread Conversations**: Follow-up questions in the same thread maintain context
- **Direct Messages**: Private conversations with the bot
- **Chart Support**: Handles chart generation requests from the backend
- **Context Awareness**: Maintains conversation history for better follow-up responses
- **Streaming Responses**: Real-time streaming from the backend for better UX

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd slack-bot
npm install
```

### 2. Configure the Bot

Copy the example config and update it with your settings:

```bash
cp config.json.example config.json
```

Edit `config.json`:

```json
{
  "backend": {
    "url": "http://localhost:3001",
    "endpoint": "/v1/chat/completions"
  },
  "slack": {
    "botToken": "xoxb-your-bot-token",
    "signingSecret": "your-signing-secret",
    "appToken": "xapp-your-app-token"
  },
  "features": {
    "enableMentionOnly": true,
    "enableThreading": true,
    "maxResponseLength": 3000
  }
}
```

### 3. Set up Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name your app (e.g., "Chat2DB Bot")
4. Select your workspace

#### Configure OAuth & Permissions

1. Go to "OAuth & Permissions" in the sidebar
2. Add these Bot Token Scopes:
   - `app_mentions:read`
   - `channels:history`
   - `chat:write`
   - `groups:history`
   - `im:history`
   - `mpim:history`
   - `users:read`

3. Install the app to your workspace
4. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

#### Configure Event Subscriptions

1. Go to "Event Subscriptions" in the sidebar
2. Enable Events
3. Add your Request URL (if using ngrok: `https://your-ngrok-url/slack/events`)
4. Subscribe to these bot events:
   - `app_mention`
   - `message.im`
   - `app_home_opened`

#### Configure Socket Mode (Recommended)

1. Go to "Socket Mode" in the sidebar
2. Enable Socket Mode
3. Generate an App-Level Token (starts with `xapp-`)

### 4. Update Configuration

Update your `config.json` with the tokens from Slack:

```json
{
  "slack": {
    "botToken": "xoxb-your-actual-bot-token",
    "signingSecret": "your-actual-signing-secret", 
    "appToken": "xapp-your-actual-app-token"
  }
}
```

### 5. Start the Bot

```bash
npm start
```

For development with auto-restart and debugging on:

```bash
npm run dev
```

## 🎯 Usage

### Channel Mentions

Mention the bot in any channel:

```
@Chat2DB Show me the top 10 products by sales
```

The bot will respond in a thread, and you can ask follow-up questions in the same thread:

```
@Chat2DB Can you show that as a bar chart?
```

### Direct Messages

Send a direct message to the bot:

```
Show me the top 5 customers by order value
```

### Example Queries

- "What are the top 10 products by revenue?"
- "Show me sales by month for the last year"
- "Which customers have the highest order values?"
- "Can you create a pie chart of sales by category?"

## ⚙️ Configuration Options

### Backend Settings

- `url`: Your Chat2DB backend URL (default: `http://localhost:3001`)
- `endpoint`: API endpoint (default: `/v1/chat/completions`)

### Slack Settings

- `botToken`: Your Slack bot token (starts with `xoxb-`)
- `signingSecret`: Your Slack app signing secret
- `appToken`: Your Slack app token for Socket Mode (starts with `xapp-`)

### Feature Settings

- `enableMentionOnly`: Only respond to @mentions (default: `true`)
- `enableThreading`: Use threads for responses (default: `true`)
- `maxResponseLength`: Maximum response length in characters (default: `3000`)

## 🔧 Development

### Project Structure

```
slack-bot/
├── index.js              # Main bot application
├── config.json           # Configuration file
├── package.json          # Dependencies
└── README.md            # This file
```

### Key Components

- **Event Handlers**: Handle Slack events (`app_mention`, `message`, `app_home_opened`)
- **Backend Integration**: Communicates with Chat2DB backend via HTTP/SSE
- **Context Management**: Maintains conversation history per thread/user
- **Response Formatting**: Formats backend responses for Slack

### Adding Features

1. **New Event Types**: Add handlers in `index.js`
2. **Backend Integration**: Modify `callBackend()` function
3. **Response Formatting**: Update response formatting logic

## 🐛 Troubleshooting

### Common Issues

1. **Bot not responding**: Check bot token and permissions
2. **Connection errors**: Verify backend URL and network connectivity
3. **Context not working**: Ensure bot has `channels:history` permission
4. **Charts not showing**: Backend chart generation may need configuration

### Debug Mode

Enable debug logging by setting environment variable:

```bash
DEBUG=* npm start
```

### Logs

Check console output for:
- Connection status
- Event processing
- Backend communication
- Error messages

## 🔗 Integration with Chat2DB Backend

This Slack bot connects to your existing Chat2DB backend and:

1. **Forwards messages** to the `/v1/chat/completions` endpoint
2. **Maintains context** by including conversation history
3. **Handles streaming** responses from the backend
4. **Processes tool calls** (like chart generation)
5. **Formats responses** for Slack's interface

The bot is designed to work seamlessly with your existing backend without requiring any changes to the main Chat2DB application.

## 📝 License

MIT License - see main project LICENSE file. 