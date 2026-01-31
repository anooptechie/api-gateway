// Phase 5: Metrics Store (in-memory)

const metrics = {
  total_requests: 0,
  rate_limited_requests: 0,
  circuit_blocked_requests: 0,
  downstream_failures: 0,
  successful_requests: 0,
};

//Increment a metric by name
function increment(metricName) {
  if (metrics[metricName] !== undefined) {
    metrics[metricName] += 1;
  }
}


//Get a snapshot of current metrics
function getMetrics() {
  return { ...metrics };
}


//Reset metrics 
function resetMetrics() {
  Object.keys(metrics).forEach((key) => {
    metrics[key] = 0;
  });
}

module.exports = {
  increment,
  getMetrics,
  resetMetrics,
};
