require('dotenv').config();
const { App } = require('@slack/bolt');
const axios = require('axios');
const config = require('./config.json');

// Initialize Slack app
const app = new App({
  token: config.slack.botToken,
  signingSecret: config.slack.signingSecret,
  socketMode: true,
  appToken: config.slack.appToken,
});

// Store conversation context per thread
const conversationContext = new Map();

// Helper function to clean bot mention from message
function cleanMessage(message) {
  return message.replace(/<@[A-Z0-9]+>/g, '').trim();
}

// Helper function to get conversation history for context
async function getConversationHistory(channelId, threadTs) {
  try {
    const result = await app.client.conversations.replies({
      token: config.slack.botToken,
      channel: channelId,
      ts: threadTs,
      limit: 50
    });

    if (!result.ok || !result.messages) {
      return [];
    }

    // Convert Slack messages to OpenAI format
    return result.messages
      .filter(msg => msg.text && !msg.bot_id) // Filter out bot messages
      .map(msg => ({
        role: 'user',
        content: cleanMessage(msg.text)
      }));
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return [];
  }
}

// Helper function to call the backend API
async function callBackend(messages, stream = false) {
  try {
    const payload = {
      messages: messages,
      stream: stream
    };

    if (stream) {
      // For streaming, we'll use a simple approach that collects the full response
      // since Slack doesn't support real-time streaming in the same way
      const response = await axios.post(`${config.backend.url}${config.backend.endpoint}`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        responseType: 'stream'
      });

      return new Promise((resolve, reject) => {
        let responseData = '';
        let toolCalls = [];

        response.data.on('data', (chunk) => {
          const lines = chunk.toString().split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                resolve({ content: responseData, toolCalls });
                return;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices[0]) {
                  const choice = parsed.choices[0];
                  
                  if (choice.delta && choice.delta.content) {
                    responseData += choice.delta.content;
                  }
                  
                  if (choice.delta && choice.delta.tool_calls) {
                    toolCalls.push(...choice.delta.tool_calls);
                  }
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        });

        response.data.on('end', () => {
          resolve({ content: responseData, toolCalls });
        });

        response.data.on('error', (error) => {
          reject(error);
        });
      });
    } else {
      const response = await axios.post(`${config.backend.url}${config.backend.endpoint}`, payload, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      return {
        content: response.data.choices[0].message.content,
        toolCalls: response.data.choices[0].message.tool_calls || []
      };
    }
  } catch (error) {
    console.error('Error calling backend:', error);
    throw error;
  }
}

// Handle app mentions
app.event('app_mention', async ({ event, say }) => {
  try {
    const userMessage = cleanMessage(event.text);
    const threadTs = event.thread_ts || event.ts;
    const contextKey = `${event.channel}-${threadTs}`;

    // Get conversation history for context
    const history = await getConversationHistory(event.channel, threadTs);
    
    // Add current message to history
    const messages = [...history, { role: 'user', content: userMessage }];

    // Store context for this thread
    conversationContext.set(contextKey, messages);

    // Call backend with streaming
    const response = await callBackend(messages, true);
    
    // Format response for Slack
    let responseText = response.content || 'I encountered an error processing your request.';
    
    // Handle tool calls (charts)
    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        if (toolCall.function && toolCall.function.name === 'chart_renderer') {
          try {
            const chartData = JSON.parse(toolCall.function.arguments);
            responseText += `\n\n📊 Chart generated: ${chartData.type} chart`;
            responseText += `\nData points: ${chartData.data.datasets?.[0]?.data?.length || 0}`;
          } catch (e) {
            console.error('Error parsing chart data:', e);
          }
        }
      }
    }

    // Truncate if too long
    if (responseText.length > config.features.maxResponseLength) {
      responseText = responseText.substring(0, config.features.maxResponseLength) + '...';
    }

    // Reply in thread
    await say({
      text: responseText,
      thread_ts: threadTs
    });

  } catch (error) {
    console.error('Error handling app mention:', error);
    await say({
      text: 'Sorry, I encountered an error processing your request. Please try again.',
      thread_ts: event.thread_ts || event.ts
    });
  }
});

// Handle direct messages
app.event('message', async ({ event, say }) => {
  // Only handle DMs, not channel messages
  if (event.channel_type !== 'im') {
    return;
  }

  try {
    const userMessage = event.text;
    const contextKey = `dm-${event.user}`;
    
    // Get existing context or start new
    let messages = conversationContext.get(contextKey) || [];
    messages.push({ role: 'user', content: userMessage });
    
    // Store updated context
    conversationContext.set(contextKey, messages);

    // Call backend
    const response = await callBackend(messages, false);
    
    let responseText = response.content || 'I encountered an error processing your request.';
    
    // Handle tool calls
    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        if (toolCall.function && toolCall.function.name === 'chart_renderer') {
          try {
            const chartData = JSON.parse(toolCall.function.arguments);
            responseText += `\n\n📊 Chart generated: ${chartData.type} chart`;
            responseText += `\nData points: ${chartData.data.datasets?.[0]?.data?.length || 0}`;
          } catch (e) {
            console.error('Error parsing chart data:', e);
          }
        }
      }
    }

    // Truncate if too long
    if (responseText.length > config.features.maxResponseLength) {
      responseText = responseText.substring(0, config.features.maxResponseLength) + '...';
    }

    await say({
      text: responseText
    });

  } catch (error) {
    console.error('Error handling DM:', error);
    await say({
      text: 'Sorry, I encountered an error processing your request. Please try again.'
    });
  }
});

// Handle app home opened
app.event('app_home_opened', async ({ event, say }) => {
  if (event.tab === 'home') {
    await say({
      text: '👋 Welcome to Chat2DB Slack Bot!\n\nYou can:\n• @mention me in any channel to ask database questions\n• Send me a direct message for private conversations\n• Ask follow-up questions in the same thread for context\n\nTry asking me something like "Show me the top 5 products by sales"'
    });
  }
});

// Error handling
app.error((error) => {
  console.error('Slack app error:', error);
});

// Start the app
(async () => {
  await app.start();
  console.log('🤖 Chat2DB Slack Bot is running!');
  console.log(`📡 Backend URL: ${config.backend.url}`);
  console.log(`⚙️  Features: Mention-only=${config.features.enableMentionOnly}, Threading=${config.features.enableThreading}`);
})(); 