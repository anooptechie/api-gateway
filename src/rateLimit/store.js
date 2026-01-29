const store = new Map();

function get(key) {
  return store.get(key);
}

function set(key, value) {
  return store.set(key, value);
}

module.exports = { get, set };
