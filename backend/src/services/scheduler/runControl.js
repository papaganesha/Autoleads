const stoppedRuns = new Set();

function requestStop(runId) {
  stoppedRuns.add(runId);
}

function isStopRequested(runId) {
  return stoppedRuns.has(runId);
}

function clearStop(runId) {
  stoppedRuns.delete(runId);
}

module.exports = { requestStop, isStopRequested, clearStop };
