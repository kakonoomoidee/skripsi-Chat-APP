const authRoutes = require("./authRoutes");
const systemRoutes = require("./systemRoutes");

/**
 * Mounts all Express HTTP routes to the application instance.
 * @param {Object} app - The Express application instance.
 * @param {Object} io - The Socket.IO server instance.
 * @returns {void}
 */
const setupRoutes = (app, io) => {
  app.use("/auth", authRoutes);
  app.use("/", systemRoutes(io));
};

module.exports = { setupRoutes };
