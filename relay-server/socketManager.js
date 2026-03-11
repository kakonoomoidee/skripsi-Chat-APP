const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("./config");
const { gossipToOtherRelays } = require("./relayService");

const activeUsers = new Set();

/**
 * Initializes Socket.IO logic, middleware, and real-time active user tracking.
 *
 * @param {object} io - The Socket.IO server instance.
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
    activeUsers.add(user);
    console.log(
      `Client connected locally: ${user}. Total active: ${activeUsers.size}`,
    );

    socket.join(user);

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
      activeUsers.delete(user);
      console.log(
        `Client disconnected: ${user}. Total active: ${activeUsers.size}`,
      );
    });
  });
};

/**
 * Retrieves the current count of active socket connections.
 *
 * @returns {number} The count of active users.
 */
const getActiveUsersCount = () => activeUsers.size;

module.exports = {
  initSocketManager,
  getActiveUsersCount,
};
