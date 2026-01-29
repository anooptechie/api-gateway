// Phase 4: Circuit Breaker Store (in-memory)

// How many consecutive failures before opening the circuit
const FAILURE_THRESHOLD = 3;

// How long the circuit stays open (in ms)
const COOLDOWN_MS = 30_000;

// In-memory circuit state per service
const circuits = {};

// Get or initialize circuit state for a service
function getCircuit(serviceName) {
  if (!circuits[serviceName]) {
    circuits[serviceName] = {
      state: "CLOSED",        // CLOSED | OPEN
      failureCount: 0,
      lastFailureTime: null,
    };
  }

  return circuits[serviceName];
}

// Record a failure for a service
// Called on timeout, 5xx, or network error

function recordFailure(serviceName) {
  const circuit = getCircuit(serviceName);

  circuit.failureCount += 1;
  circuit.lastFailureTime = Date.now();

  if (circuit.failureCount >= FAILURE_THRESHOLD) {
    circuit.state = "OPEN";
  }
}


// Record a success for a service
// Called when downstream responds successfully

function recordSuccess(serviceName) {
  const circuit = getCircuit(serviceName);

  circuit.state = "CLOSED";
  circuit.failureCount = 0;
  circuit.lastFailureTime = null;
}


// Check if the circuit is currently open
// If cooldown has passed, automatically close it
function isCircuitOpen(serviceName) {
  const circuit = getCircuit(serviceName);

  if (circuit.state === "OPEN") {
    const elapsed = Date.now() - circuit.lastFailureTime;

    // Cooldown expired → close circuit
    if (elapsed > COOLDOWN_MS) {
      circuit.state = "CLOSED";
      circuit.failureCount = 0;
      circuit.lastFailureTime = null;
      return false;
    }

    return true;
  }

  return false;
}

module.exports = {
  isCircuitOpen,
  recordFailure,
  recordSuccess,
};
