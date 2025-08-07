require('dotenv').config();
const { App } = require('@slack/bolt');
const axios = require('axios');
const config = require('./config.json');
const { debugLog, debugError, debugWarn, debugInfo, isDebugMode } = require('./utils/debug');

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
    debugLog('🔍', 'Getting conversation history for:', { channelId, threadTs });
    
    const result = await app.client.conversations.replies({
      token: config.slack.botToken,
      channel: channelId,
      ts: threadTs,
      limit: 50
    });

    debugLog('🔍', 'Conversation history result:', {
      ok: result.ok,
      messageCount: result.messages ? result.messages.length : 0,
      messages: result.messages ? result.messages.map(m => ({
        text: m.text?.substring(0, 50) + '...',
        bot_id: m.bot_id,
        user: m.user
      })) : []
    });

    if (!result.ok || !result.messages) {
      debugLog('❌', 'No conversation history found');
      return [];
    }

    // Convert Slack messages to OpenAI format, including both user and bot messages
    const conversation = [];
    
    for (const msg of result.messages) {
      if (msg.text) {
        if (msg.bot_id) {
          // This is a bot message - add as assistant
          conversation.push({
            role: 'assistant',
            content: msg.text
          });
          debugLog('🤖', 'Added bot message:', msg.text.substring(0, 50) + '...');
        } else {
          // This is a user message - add as user
          const cleanedText = cleanMessage(msg.text);
          conversation.push({
            role: 'user',
            content: cleanedText
          });
          debugLog('👤', 'Added user message:', cleanedText.substring(0, 50) + '...');
        }
      }
    }
    
    debugLog('📝', 'Final conversation context:', {
      totalMessages: conversation.length,
      userMessages: conversation.filter(m => m.role === 'user').length,
      assistantMessages: conversation.filter(m => m.role === 'assistant').length
    });
    
    return conversation;
  } catch (error) {
    debugError('❌', 'Error getting conversation history:', error);
    return [];
  }
}

// Helper function to split long messages for Slack
function splitMessageForSlack(text, maxLength = 3000) {
  if (text.length <= maxLength) {
    return [text];
  }
  
  const chunks = [];
  let currentChunk = '';
  
  const lines = text.split('\n');
  for (const line of lines) {
    if ((currentChunk + line + '\n').length > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  
  return chunks;
}

// Helper function to call the backend API with streaming updates
async function callBackend(messages, stream = false, updateCallback = null) {
  try {
    const payload = {
      messages: messages,
      stream: stream
    };

    if (stream && updateCallback) {
      // For streaming with real-time updates
      const response = await axios.post(`${config.backend.url}${config.backend.endpoint}`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        responseType: 'stream'
      });

      return new Promise((resolve, reject) => {
        let responseData = '';
        let toolCalls = [];
        let summary = '';
        let isProcessing = false;

        response.data.on('data', (chunk) => {
          const lines = chunk.toString().split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                resolve({ content: responseData, toolCalls, summary });
                return;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices[0]) {
                  const choice = parsed.choices[0];
                  
                  if (choice.delta && choice.delta.content) {
                    const newContent = choice.delta.content;
                    responseData += newContent;
                    
                    // Check if we're starting the summary section
                    if (responseData.includes('**Summary:**') && !isProcessing) {
                      isProcessing = true;
                      // Find where summary starts and extract from there
                      const summaryStart = responseData.indexOf('**Summary:**') + '**Summary:**'.length;
                      summary = responseData.substring(summaryStart);
                    } else if (isProcessing) {
                      // We're already processing summary, just append new content
                      summary += newContent;
                      
                      // Check if we've hit the end (chart suggestion)
                      if (summary.includes('Would you like me to show this result as a') || summary.includes('chart?')) {
                        // Remove the chart suggestion part
                        const chartIndex = summary.indexOf('Would you like me to show this result as a');
                        if (chartIndex !== -1) {
                          summary = summary.substring(0, chartIndex);
                        }
                        isProcessing = false;
                      }
                    }
                    
                    // Don't show any intermediate content - just wait for summary
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
          resolve({ content: responseData, toolCalls, summary });
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
    debugError('❌', 'Error calling backend:', error);
    throw error;
  }
}

// Handle app mentions
app.event('app_mention', async ({ event, say }) => {
  try {
    const userMessage = cleanMessage(event.text);
    const threadTs = event.thread_ts || event.ts;
    const contextKey = `${event.channel}-${threadTs}`;
    
    debugLog('📧', 'Event details:', {
      channel: event.channel,
      thread_ts: event.thread_ts,
      ts: event.ts,
      threadTs,
      contextKey,
      hasThread: !!event.thread_ts
    });

    // Get conversation history for context
    const history = await getConversationHistory(event.channel, threadTs);
    
    // Add current message to history
    const messages = [...history, { role: 'user', content: userMessage }];

    debugLog('🧠', 'Processing user query:', {
      userMessage: userMessage.substring(0, 100) + '...',
      historyLength: history.length,
      totalMessages: messages.length,
      contextKey
    });

    // Store context for this thread (will be updated with bot response later)
    conversationContext.set(contextKey, messages);

    // Send initial thinking message
    const thinkingMessage = await say({
      text: '🤔 Thinking...',
      thread_ts: threadTs
    });

    // Call backend and get summary
    const response = await callBackend(messages, true, async (content, isNewMessage) => {
      // Don't show any intermediate content - just wait for summary
    });

    // Use the summary for the final response
    let finalResponse = response.summary || response.content || 'I encountered an error processing your request.';
    
    // Handle tool calls (charts)
    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        if (toolCall.function && toolCall.function.name === 'chart_renderer') {
          try {
            const chartData = JSON.parse(toolCall.function.arguments);
            finalResponse += `\n\n📊 Chart generated: ${chartData.type} chart`;
            finalResponse += `\nData points: ${chartData.data.datasets?.[0]?.data?.length || 0}`;
          } catch (e) {
            console.error('Error parsing chart data:', e);
          }
        }
      }
    }

    // Split and send response
    const chunks = splitMessageForSlack(finalResponse);
    
    // Update the thinking message with the first chunk
    await app.client.chat.update({
      token: config.slack.botToken,
      channel: event.channel,
      ts: thinkingMessage.ts,
      text: chunks[0]
    });
    
    // Send remaining chunks as new messages
    for (let i = 1; i < chunks.length; i++) {
      await say({
        text: chunks[i],
        thread_ts: threadTs
      });
    }

    // Update conversation context with the bot's response
    const botResponse = chunks.join('\n');
    const updatedMessages = [...messages, { role: 'assistant', content: botResponse }];
    conversationContext.set(contextKey, updatedMessages);

  } catch (error) {
    debugError('❌', 'Error handling app mention:', error);
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

    // Send initial thinking message
    const thinkingMessage = await say({
      text: '🤔 Thinking...'
    });

    // Call backend and get summary
    const response = await callBackend(messages, true, async (content, isNewMessage) => {
      // Don't show any intermediate content - just wait for summary
    });

    // Use the summary for the final response
    let finalResponse = response.summary || response.content || 'I encountered an error processing your request.';
    
    // Handle tool calls (charts)
    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        if (toolCall.function && toolCall.function.name === 'chart_renderer') {
          try {
            const chartData = JSON.parse(toolCall.function.arguments);
            finalResponse += `\n\n📊 Chart generated: ${chartData.type} chart`;
            finalResponse += `\nData points: ${chartData.data.datasets?.[0]?.data?.length || 0}`;
          } catch (e) {
            console.error('Error parsing chart data:', e);
          }
        }
      }
    }

    // Split and send response
    const chunks = splitMessageForSlack(finalResponse);
    
    // Update the thinking message with the first chunk
    await app.client.chat.update({
      token: config.slack.botToken,
      channel: event.channel,
      ts: thinkingMessage.ts,
      text: chunks[0]
    });
    
    // Send remaining chunks as new messages
    for (let i = 1; i < chunks.length; i++) {
      await say({
        text: chunks[i]
      });
    }

    // Update conversation context with the bot's response
    const botResponse = chunks.join('\n');
    const updatedMessages = [...messages, { role: 'assistant', content: botResponse }];
    conversationContext.set(contextKey, updatedMessages);

  } catch (error) {
    debugError('❌', 'Error handling DM:', error);
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
  debugError('❌', 'Slack app error:', error);
});

// Start the app
(async () => {
  await app.start();
  console.log('🤖 Chat2DB Slack Bot is running!');
  console.log(`📡 Backend URL: ${config.backend.url}`);
  console.log(`⚙️  Features: Mention-only=${config.features.enableMentionOnly}, Threading=${config.features.enableThreading}`);
  
  if (isDebugMode) {
    debugLog('🔧', 'Debug mode enabled');
  }
  
  // Test bot permissions
  try {
    const authTest = await app.client.auth.test({
      token: config.slack.botToken
    });
    debugLog('🔐', 'Bot authentication test:', {
      ok: authTest.ok,
      bot_id: authTest.bot_id,
      user_id: authTest.user_id,
      team_id: authTest.team_id
    });
  } catch (error) {
    debugError('❌', 'Bot authentication test failed:', error);
  }
})(); 