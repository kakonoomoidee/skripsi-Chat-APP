const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("./config");
const { gossipToOtherRelays } = require("./relayService");

const activeSessions = new Map();

/**
 * Initializes Socket.IO logic, authentication middleware, and connection tracking.
 * Enforces a single-session policy across different devices to prevent split-brain routing.
 *
 * @param {Object} io - The Socket.IO server instance.
 * @returns {void}
 */
const initSocketManager = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication failed: No token provided."));
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(
          new Error("Authentication failed: Invalid or expired token."),
        );
      }
      socket.userAddress = decoded.address;
      next();
    });
  });

  io.on("connection", (socket) => {
    const user = socket.userAddress.toLowerCase();

    if (activeSessions.has(user)) {
      const oldSocketId = activeSessions.get(user);
      console.warn(
        `[Session Conflict] Revoking previous session for user: ${user}`,
      );

      io.to(oldSocketId).emit("session_revoked", {
        reason:
          "Your account was accessed from another device. This session has been terminated.",
      });
    }

    activeSessions.set(user, socket.id);
    socket.join(user);

    console.log(
      `[Socket Manager] Client connected: ${user}. Total active sessions: ${activeSessions.size}`,
    );

    socket.on("send_message", (data) => {
      const to = data.to.toLowerCase();
      const payload = {
        from: user,
        message: data.encryptedMessage,
        timestamp: Date.now(),
      };

      io.to(to).emit("receive_message", payload);
      gossipToOtherRelays("receive_message", to, payload);
    });

    socket.on("handshake_init", (data) => {
      const to = data.to.toLowerCase();
      const payload = {
        from: user,
        ephemeralPublicKey: data.ephemeralPublicKey,
      };

      io.to(to).emit("handshake_offer", payload);
      gossipToOtherRelays("handshake_offer", to, payload);
    });

    socket.on("handshake_response", (data) => {
      const to = data.to.toLowerCase();
      const payload = {
        from: user,
        ephemeralPublicKey: data.ephemeralPublicKey,
      };

      io.to(to).emit("handshake_answer", payload);
      gossipToOtherRelays("handshake_answer", to, payload);
    });

    socket.on("webrtc_signal", (data) => {
      const to = data.to.toLowerCase();
      const payload = { from: user, signal: data.signal };

      io.to(to).emit("webrtc_signal", payload);
      gossipToOtherRelays("webrtc_signal", to, payload);
    });

    socket.on("disconnect", () => {
      if (activeSessions.get(user) === socket.id) {
        activeSessions.delete(user);
      }
      console.log(
        `[Socket Manager] Client disconnected: ${user}. Total active sessions: ${activeSessions.size}`,
      );
    });
  });
};

/**
 * Retrieves the current count of active WebSocket connections.
 *
 * @returns {number} The total number of connected users.
 */
const getActiveUsersCount = () => activeSessions.size;

module.exports = {
  initSocketManager,
  getActiveUsersCount,
};
