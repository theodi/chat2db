#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load configuration
let config;
try {
  config = require('./launcher.config.json');
} catch (error) {
  console.error('❌ Error loading launcher.config.json:', error.message);
  console.log('Using default configuration...');
  config = {
    services: {
      main: {
        enabled: true,
        port: 3001,
        script: 'npm start',
        cwd: '.',
        name: 'Main Service'
      },
      frontend: {
        enabled: false,
        port: 3000,
        script: 'npm run dev',
        cwd: './frontend',
        name: 'Frontend'
      },
      slackBot: {
        enabled: false,
        script: 'npm run dev',
        cwd: './slack-bot',
        name: 'Slack Bot'
      }
    },
    presets: {
      main: { services: ['main'] },
      frontend: { services: ['main', 'frontend'] },
      slack: { services: ['main', 'slackBot'] },
      all: { services: ['main', 'frontend', 'slackBot'] }
    }
  };
}

// Check if services exist
function checkServiceExists(servicePath) {
  return fs.existsSync(path.join(process.cwd(), servicePath));
}

// Start a service
function startService(serviceKey, serviceConfig) {
  if (!serviceConfig.enabled) {
    console.log(`⏭️  ${serviceConfig.name} disabled in config`);
    return null;
  }

  if (!checkServiceExists(serviceConfig.cwd)) {
    console.log(`❌ ${serviceConfig.name} not found at ${serviceConfig.cwd}`);
    return null;
  }

  console.log(`🚀 Starting ${serviceConfig.name}...`);
  
  const scriptName = serviceConfig.script.includes('npm run') ? serviceConfig.script.replace('npm run ', '') : 'start';
  const child = spawn('npm', ['run', scriptName], {
    cwd: path.join(process.cwd(), serviceConfig.cwd),
    stdio: 'pipe',
    shell: true,
    env: {
      ...process.env,
      PORT: serviceConfig.port || process.env.PORT
    }
  });

  // Color coding for different services
  const colors = {
    'Main Service': '\x1b[36m', // Cyan
    'Frontend': '\x1b[32m',     // Green
    'Slack Bot': '\x1b[35m'     // Magenta
  };
  const reset = '\x1b[0m';
  const color = colors[serviceConfig.name] || '\x1b[37m';

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${color}[${serviceConfig.name}]${reset} ${line}`);
      }
    });
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${color}[${serviceConfig.name}]${reset} ${line}`);
      }
    });
  });

  child.on('error', (error) => {
    console.error(`❌ Error starting ${serviceConfig.name}:`, error);
  });

  child.on('close', (code) => {
    console.log(`🔚 ${serviceConfig.name} exited with code ${code}`);
  });

  return child;
}

// Main launcher function
function launchServices(preset = null) {
  console.log('🚀 Chat2DB Service Launcher');
  console.log('============================');
  
  let servicesToStart = [];
  
  if (preset && config.presets[preset]) {
    // Use preset
    const presetConfig = config.presets[preset];
    console.log(`📋 Using preset: ${preset} - ${presetConfig.description}`);
    servicesToStart = presetConfig.services;
  } else {
    // Use enabled services from config
    servicesToStart = Object.entries(config.services)
      .filter(([key, service]) => service.enabled)
      .map(([key, service]) => key);
  }
  
  if (servicesToStart.length === 0) {
    console.log('❌ No services to start');
    console.log('Edit launcher.config.json to enable services or use a preset');
    process.exit(1);
  }

  console.log(`📋 Starting ${servicesToStart.length} service(s):`);
  servicesToStart.forEach(serviceKey => {
    const service = config.services[serviceKey];
    console.log(`   • ${service.name} (${service.cwd})`);
  });
  console.log('');

  // Start all services
  const processes = [];
  
  servicesToStart.forEach(serviceKey => {
    const service = config.services[serviceKey];
    const process = startService(serviceKey, service);
    if (process) {
      processes.push(process);
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down all services...');
    processes.forEach(child => {
      if (child && !child.killed) {
        child.kill('SIGINT');
      }
    });
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down all services...');
    processes.forEach(child => {
      if (child && !child.killed) {
        child.kill('SIGTERM');
      }
    });
    process.exit(0);
  });

  // Handle process errors
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    processes.forEach(child => {
      if (child && !child.killed) {
        child.kill();
      }
    });
    process.exit(1);
  });
}

// CLI argument parsing
const args = process.argv.slice(2);
const command = args[0];

if (command === '--help' || command === '-h') {
  console.log(`
Chat2DB Service Launcher

Usage:
  node launcher.js [preset]

Presets:
  main            Main service only (default)
  frontend        Main service + Frontend
  slack           Main service + Slack Bot
  all             All services

Commands:
  --help, -h      Show this help

Configuration:
  Edit launcher.config.json to customize services and presets
`);
  process.exit(0);
}

// Handle preset selection
let selectedPreset = null;
if (command && config.presets[command]) {
  selectedPreset = command;
} else if (command) {
  console.log(`❌ Unknown preset: ${command}`);
  console.log('Available presets:', Object.keys(config.presets).join(', '));
  process.exit(1);
}

// Start the services
launchServices(selectedPreset); 