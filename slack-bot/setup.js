#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  console.log('🤖 Chat2DB Slack Bot Setup\n');
  console.log('This script will help you configure your Slack bot.\n');

  // Check if config.json already exists
  const configPath = path.join(__dirname, 'config.json');
  if (fs.existsSync(configPath)) {
    const overwrite = await question('config.json already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('\n📡 Backend Configuration:');
  const backendUrl = await question('Backend URL (default: http://localhost:3001): ') || 'http://localhost:3001';
  const backendEndpoint = await question('API Endpoint (default: /v1/chat/completions): ') || '/v1/chat/completions';

  console.log('\n🔧 Slack Configuration:');
  console.log('You can find these values in your Slack app settings at https://api.slack.com/apps');
  const botToken = await question('Bot Token (starts with xoxb-): ');
  const signingSecret = await question('Signing Secret: ');
  const appToken = await question('App Token (starts with xapp-, for Socket Mode): ');

  console.log('\n⚙️ Feature Configuration:');
  const enableMentionOnly = await question('Enable mention-only mode? (Y/n): ') !== 'n';
  const enableThreading = await question('Enable threading for responses? (Y/n): ') !== 'n';
  const maxResponseLength = await question('Max response length (default: 3000): ') || '3000';

  const config = {
    backend: {
      url: backendUrl,
      endpoint: backendEndpoint
    },
    slack: {
      botToken: botToken,
      signingSecret: signingSecret,
      appToken: appToken
    },
    features: {
      enableMentionOnly: enableMentionOnly,
      enableThreading: enableThreading,
      maxResponseLength: parseInt(maxResponseLength)
    }
  };

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('\n✅ Configuration saved to config.json');
    console.log('\n📋 Next Steps:');
    console.log('1. Make sure your Chat2DB backend is running');
    console.log('2. Install dependencies: npm install');
    console.log('3. Start the bot: npm start');
    console.log('\n🎯 Test the bot by mentioning it in a Slack channel!');
  } catch (error) {
    console.error('❌ Error saving configuration:', error.message);
  }

  rl.close();
}

setup().catch(console.error); 