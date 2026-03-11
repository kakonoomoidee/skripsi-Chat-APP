const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const bodyParser = require("body-parser");

const { PORT, allowedOrigins, RPC_URL, relayerWallet } = require("./config");
const { initRelayService } = require("./relayService");
const { initSocketManager } = require("./socketManager");
const { setupRoutes } = require("./routes");

if (allowedOrigins.length === 0) {
  console.warn(
    "WARNING: ALLOWED_ORIGINS is not set. Allowing all origins (not safe for production).",
  );
}

const corsOptions = {
  origin:
    allowedOrigins.length > 0
      ? (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        }
      : "*",
};

const app = express();
app.use(cors(corsOptions));
app.use(bodyParser.json());

const httpServer = http.createServer(app);

console.log(`Blockchain connected via: ${RPC_URL}`);
console.log(`Relayer Address: ${relayerWallet.address}`);

const io = new Server(httpServer, {
  cors:
    allowedOrigins.length > 0 ? { origin: allowedOrigins } : { origin: "*" },
});

initRelayService();
initSocketManager(io);
setupRoutes(app, io);

httpServer.listen(PORT, () => {
  console.log(`Relay Server running on port ${PORT}`);
  console.log(`STATUS: WebSocket Active | Decentralized Gossip Active`);
});
