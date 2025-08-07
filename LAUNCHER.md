# 🚀 Chat2DB Service Launcher

A unified launcher for starting the Chat2DB main service plus optional frontends (Web UI and Slack Bot) in a single process.

## ✨ Features

- **Unified Launch**: Start multiple services with one command
- **Preset Configurations**: Pre-configured service combinations
- **Color-coded Output**: Each service has its own color for easy identification
- **Graceful Shutdown**: Clean shutdown of all services with Ctrl+C
- **Configuration-driven**: Easy to customize via JSON config
- **Service Validation**: Checks if services exist before starting

## 🚀 Quick Start

### Basic Usage

```bash
# Start main service only (default)
npm run launch

# Start main service + frontend
npm run launch:frontend

# Start main service + slack bot
npm run launch:slack

# Start all services
npm run launch:all
```

### Direct Commands

```bash
# Using node directly
node launcher.js main
node launcher.js frontend
node launcher.js slack
node launcher.js all

# Show help
node launcher.js --help
```

## 📋 Available Presets

| Preset | Services | Description |
|--------|----------|-------------|
| `main` | Main Service | Backend API only |
| `frontend` | Main + Frontend | Backend + Web UI |
| `slack` | Main + Slack Bot | Backend + Slack Bot |
| `all` | All Services | Complete setup |

## ⚙️ Configuration

### Service Configuration (`launcher.config.json`)

```json
{
  "services": {
    "main": {
      "enabled": true,
      "port": 3001,
      "script": "npm start",
      "cwd": ".",
      "name": "Main Service",
      "description": "Chat2DB Backend API"
    },
    "frontend": {
      "enabled": false,
      "port": 3000,
      "script": "npm run dev",
      "cwd": "./frontend",
      "name": "Frontend",
      "description": "Assistant UI Web Interface"
    },
    "slackBot": {
      "enabled": false,
      "script": "npm run dev",
      "cwd": "./slack-bot",
      "name": "Slack Bot",
      "description": "Slack Bot Interface"
    }
  }
}
```

### Service Properties

- **enabled**: Whether the service is enabled by default
- **port**: Port number for the service
- **script**: npm script to run (e.g., "npm start", "npm run dev")
- **cwd**: Working directory for the service
- **name**: Display name for the service
- **description**: Description of the service

### Preset Configuration

```json
{
  "presets": {
    "main": {
      "description": "Main service only",
      "services": ["main"]
    },
    "frontend": {
      "description": "Main service + Frontend",
      "services": ["main", "frontend"]
    },
    "slack": {
      "description": "Main service + Slack Bot",
      "services": ["main", "slackBot"]
    },
    "all": {
      "description": "All services",
      "services": ["main", "frontend", "slackBot"]
    }
  }
}
```

## 🎨 Output Format

The launcher provides color-coded output for each service:

- **Main Service**: Cyan (`[Main Service]`)
- **Frontend**: Green (`[Frontend]`)
- **Slack Bot**: Magenta (`[Slack Bot]`)

Example output:
```
🚀 Chat2DB Service Launcher
============================
📋 Using preset: frontend - Main service + Frontend
📋 Starting 2 service(s):
   • Main Service (.)
   • Frontend (./frontend)

🚀 Starting Main Service...
🚀 Starting Frontend...
[Main Service] 🚀 Backend API running at http://localhost:3001
[Frontend] ready - started server on 0.0.0.0:3000
```

## 🔧 Customization

### Adding a New Service

1. **Add service configuration** to `launcher.config.json`:
```json
{
  "services": {
    "newService": {
      "enabled": false,
      "port": 3002,
      "script": "npm run dev",
      "cwd": "./new-service",
      "name": "New Service",
      "description": "Description of new service"
    }
  }
}
```

2. **Create preset** that includes the new service:
```json
{
  "presets": {
    "withNewService": {
      "description": "Main + New Service",
      "services": ["main", "newService"]
    }
  }
}
```

3. **Add npm script** to `package.json`:
```json
{
  "scripts": {
    "launch:new": "node launcher.js withNewService"
  }
}
```

### Modifying Existing Services

Edit `launcher.config.json` to change:
- Port numbers
- Script commands
- Working directories
- Service names

### Environment Variables

The launcher passes through all environment variables to child processes. You can set:

```bash
# Debug mode for all services
DEBUG=true npm run launch:all

# Custom ports
PORT=3001 FRONTEND_PORT=3000 npm run launch:frontend

# Development mode
NODE_ENV=development npm run launch:all
```

## 🛠️ Development

### Project Structure

```
chat2db/
├── launcher.js              # Main launcher script
├── launcher.config.json     # Service configuration
├── server.js               # Main backend service
├── frontend/               # Web UI service
├── slack-bot/              # Slack bot service
└── package.json            # NPM scripts
```

### Debugging

Enable debug mode for the launcher:

```bash
DEBUG=true node launcher.js frontend
```

### Troubleshooting

**Service not found:**
- Check if the service directory exists
- Verify the `cwd` path in configuration

**Port conflicts:**
- Change port numbers in `launcher.config.json`
- Ensure ports are not in use by other processes

**Permission errors:**
- Ensure npm scripts exist in service directories
- Check file permissions

**Service fails to start:**
- Check service-specific logs in colored output
- Verify dependencies are installed in service directories

## 📝 Examples

### Development Workflow

```bash
# Start with frontend for development
npm run launch:frontend

# Start with slack bot for testing
npm run launch:slack

# Start everything for full testing
npm run launch:all
```

### Production Deployment

```bash
# Start main service only
npm run launch:main

# Or with custom configuration
node launcher.js main
```

### Custom Configuration

```bash
# Use custom config file
cp launcher.config.json launcher.config.prod.json
# Edit launcher.config.prod.json
node launcher.js --config launcher.config.prod.json
```

## 🔗 Integration

The launcher integrates seamlessly with:

- **Main Backend**: Chat2DB API service
- **Frontend**: Assistant UI web interface
- **Slack Bot**: Slack bot interface
- **Debug Mode**: Conditional logging for all services
- **Environment Variables**: Pass-through to all services

## 📄 License

MIT License - see main project LICENSE file. 