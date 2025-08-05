#!/usr/bin/env node

const axios = require('axios');
const config = require('./config.json');

async function testBackend() {
  console.log('🧪 Testing Chat2DB Backend Connection\n');
  
  try {
    console.log(`📡 Backend URL: ${config.backend.url}${config.backend.endpoint}`);
    
    const testPayload = {
      messages: [
        { role: 'user', content: 'Hello, can you tell me about your database?' }
      ],
      stream: false
    };

    console.log('📤 Sending test request...');
    const response = await axios.post(`${config.backend.url}${config.backend.endpoint}`, testPayload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000
    });

    console.log('✅ Backend connection successful!');
    console.log(`📊 Response status: ${response.status}`);
    console.log(`🤖 Model used: ${response.data.model}`);
    console.log(`💬 Response length: ${response.data.choices[0].message.content.length} characters`);
    
    if (response.data.choices[0].message.content.length > 100) {
      console.log(`📝 Response preview: ${response.data.choices[0].message.content.substring(0, 100)}...`);
    } else {
      console.log(`📝 Full response: ${response.data.choices[0].message.content}`);
    }

    console.log('\n🎉 Backend is ready for the Slack bot!');
    
  } catch (error) {
    console.error('❌ Backend connection failed:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   • Backend server is not running');
      console.error('   • Make sure to start the backend with: node server.js');
    } else if (error.response) {
      console.error(`   • HTTP ${error.response.status}: ${error.response.statusText}`);
      console.error(`   • Response: ${error.response.data?.error?.message || 'Unknown error'}`);
    } else {
      console.error(`   • ${error.message}`);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure the backend is running on the correct port');
    console.log('   2. Check that config.json has the correct backend URL');
    console.log('   3. Verify the backend is accessible from this machine');
    
    process.exit(1);
  }
}

testBackend(); 