const routes = require("../config/routes.json");

function resolveRoute(path) {
  for (const prefix of Object.keys(routes)) {
    if (path.startsWith(prefix)) {
      return {
        prefix,
        target: routes[prefix],
      };
    }
  }

  return null;
}

module.exports = {
  resolveRoute,
};
