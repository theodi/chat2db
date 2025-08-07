const isDebugMode = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';

function debugLog(emoji, message, data = null) {
  if (isDebugMode) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${emoji} ${message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
}

function debugError(emoji, message, error = null) {
  if (isDebugMode) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${emoji} ${message}`;
    
    if (error) {
      console.error(logMessage, error);
    } else {
      console.error(logMessage);
    }
  }
}

function debugWarn(emoji, message, data = null) {
  if (isDebugMode) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${emoji} ${message}`;
    
    if (data) {
      console.warn(logMessage, data);
    } else {
      console.warn(logMessage);
    }
  }
}

function debugInfo(emoji, message, data = null) {
  if (isDebugMode) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${emoji} ${message}`;
    
    if (data) {
      console.info(logMessage, data);
    } else {
      console.info(logMessage);
    }
  }
}

function isDebugEnabled() {
  return isDebugMode;
}

module.exports = {
  debugLog,
  debugError,
  debugWarn,
  debugInfo,
  isDebugEnabled,
  isDebugMode
}; 