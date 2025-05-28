let lastResult = null;

function setLastResult(data) {
  lastResult = data;
}

function getLastResult() {
  return lastResult;
}

module.exports = { setLastResult, getLastResult };