<div align="center">
  <img src="https://dummyimage.com/800x200/09090b/4f46e5.png&text=SecureP2P+Chat" alt="SecureP2P Banner" width="100%" style="border-radius: 12px;"/>
  
  <br/>
  <br/>

  <img src="https://img.shields.io/badge/React-18.0-blue?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/WebRTC-P2P_Tunnel-FF6600?style=for-the-badge&logo=webrtc&logoColor=white" alt="WebRTC" />
  <img src="https://img.shields.io/badge/Solidity-Smart_Contract-363636?style=for-the-badge&logo=solidity&logoColor=white" alt="Solidity" />
  <img src="https://img.shields.io/badge/Ethers.js-Web3-2748A5?style=for-the-badge&logo=ethereum&logoColor=white" alt="Ethers.js" />
  <a href="#custom-non-commercial--absolute-privacy-license">
    <img src="https://img.shields.io/badge/License-Absolute_Privacy-darkred?style=for-the-badge" alt="License" />
  </a>
  <br/>
  <br/>

  <p>
    <b>A Web3-based Decentralized, End-to-End Encrypted, Peer-to-Peer Messaging Application.</b> <br/>
    Designed for absolute privacy, bypassing central servers entirely.
  </p>

</div>

---

## 📖 Overview

Traditional messaging platforms operate on centralized architectures where your personal data, messages, and media are stored on corporate servers. This creates single points of failure, making user data vulnerable to breaches, censorship, and unauthorized data harvesting.

**SecureP2P Chat** was built to fundamentally solve this issue by redefining how we communicate online. Developed as a final-year academic thesis, this project demonstrates the practical implementation of a **Zero-Knowledge Infrastructure**.

By completely removing the central database from the equation, SecureP2P leverages the **Ethereum Blockchain** for absolute, decentralized identity ownership, and utilizes **WebRTC Data Channels** to establish direct, military-grade encrypted tunnels between peers. When you send a message or an image, it travels directly from your device to the recipient's device—no middlemen, no server storage, no traces left behind.

## ✨ Killer Features

- **Web3 Identity & Gasless Onboarding**: Users register their username and public keys directly on the blockchain. The platform utilizes a relayer system to cover gas fees, providing a seamless Web2-like onboarding experience.
- **True Peer-to-Peer (WebRTC)**: Messages and media (images) are transmitted directly between peers bypassing central servers, preventing any third-party data retention.
- **Double-Layer Security**: Combines Blockchain Authentication with Ephemeral Elliptic Curve Diffie-Hellman (ECDH) handshakes to generate unique, per-session AES-256 encryption keys.
- **Bring Your Own Node (BYON)**: Users are not locked into default relay servers. The app supports connecting to custom infrastructure for maximum privacy.
- **Multi-Relay Architecture**: Employs Redis Pub/Sub to allow cross-relay signaling, enabling users connected to different nodes to communicate seamlessly.
- **Self-Healing Local Storage**: Chat history is stored locally using IndexedDB (Dexie.js) and can be exported/imported via heavily encrypted backup files requiring a 12-word Seed Phrase.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **P2P & Crypto**: WebRTC, Ethers.js, Crypto-js
- **Local Storage**: Dexie.js (IndexedDB)
- **Signaling Server**: Node.js, Express, Socket.io, Redis Adapter
- **Blockchain**: Solidity, Hardhat/Truffle, local EVM (Ganache)

## 🏗️ System Architecture

1.  **Identity Registry**: User registers `username` -> Smart Contract securely stores `Wallet Address` and Public Keys.
2.  **Signaling Phase**: User A wants to chat with User B. They exchange WebRTC Offers/Answers and ECDH Ephemeral Keys via the Socket.io Relay Servers.
3.  **Direct Connection**: Once the WebRTC tunnel is established, the Relay Server is completely dropped from the communication loop.
4.  **E2EE Transfer**: Text and Base64 images are encrypted via AES-256 and transmitted directly.

## 🧱 Blockchain / Smart Contract Documentation

### Identity Registry (Purpose)

The `IdentityRegistry` contract is the on-chain source of truth for user identity in SecureP2P Chat. It binds a unique `username` and ECDH `publicKey` to a wallet address and exposes verifiable lookups that the relay server uses during authentication and discovery. This enables gasless onboarding via meta-transactions, prevents username collisions, and allows clients to resolve identities without any centralized database.

**Key responsibilities:**

- ✅ Enforce unique usernames and one-to-one address ownership.
- ✅ Store the user’s ECDH public key for per-session key exchange.
- ✅ Verify login signatures for challenge-response authentication.
- ✅ Provide on-chain lookup methods for address ↔ username resolution.

## 🛰️ Relay Server Documentation

The relay server is a **stateless signaling layer**. It never stores chat content and only brokers WebRTC setup data.

### REST API Endpoints

**Base URL:** `https://<relay-host>`

| Method | Endpoint                  | Description                                               |
| ------ | ------------------------- | --------------------------------------------------------- |
| POST   | `/auth/challenge`         | Issues a short-lived nonce for wallet-based login.        |
| POST   | `/auth/login`             | Verifies signature and returns a JWT for Socket.io auth.  |
| POST   | `/auth/register`          | Registers a user on-chain (gasless meta-tx).              |
| GET    | `/auth/address/:username` | Resolves wallet address from a username.                  |
| GET    | `/auth/user/:address`     | Resolves username from a wallet address.                  |
| GET    | `/ping`                   | Simple liveness check.                                    |
| GET    | `/health`                 | Returns relay, chain, and contract health status.         |
| POST   | `/admin/register-relay`   | Registers this relay in the on-chain registry.            |
| POST   | `/internal/gossip`        | Internal relay-to-relay signaling sync (requires secret). |

> The `/internal/gossip` endpoint is for relay federation only and should be blocked from public access.

### Socket.io Events (WebRTC Signaling)

**Authentication:** clients connect with `socket.handshake.auth.token` (JWT from `/auth/login`).

**Client → Server:**

- `handshake_init` — start ECDH handshake (payload: `{ to, ephemeralPublicKey }`).
- `handshake_response` — respond to handshake (payload: `{ to, ephemeralPublicKey }`).
- `webrtc_signal` — send SDP offers/answers or ICE candidates (payload: `{ to, signal }`).

**Server → Client:**

- `handshake_offer` — forwarded handshake request (payload: `{ from, ephemeralPublicKey }`).
- `handshake_answer` — forwarded handshake response (payload: `{ from, ephemeralPublicKey }`).
- `webrtc_signal` — forwarded WebRTC signaling data (payload: `{ from, signal }`).
- `session_revoked` — forced logout if the same wallet logs in elsewhere.

### REST Response Examples

**GET `/health`**

```json
{
  "relay": {
    "status": "ok",
    "relayUrl": "https://relay-1.example.com",
    "knownRelays": 2,
    "activeConnections": 5,
    "uptime": "0d 2h 11m 40s"
  },
  "network": {
    "totalNodes": 2,
    "connectedRelays": [
      "https://relay-2.example.com",
      "https://relay-3.example.com"
    ]
  },
  "chain": {
    "rpcUrl": "http://127.0.0.1:8545",
    "rpcOk": true,
    "chainId": 1337,
    "latestBlock": 128,
    "clientVersion": "Geth/v1.10.26"
  },
  "contracts": [
    {
      "name": "Identity Registry",
      "address": "0x1234567890abcdef1234567890abcdef12345678",
      "deployed": true
    },
    {
      "name": "Relay Registry",
      "address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      "deployed": true
    }
  ]
}
```

## 🖥️ Client Documentation

### `src` Folder Structure

```
src/
  assets/
  components/
  context/
  hooks/
  layouts/
  pages/
  services/
  store/
  utils/
```

- **assets/** — Static images, fonts, and UI assets used across the app.
- **components/** — Reusable UI components grouped by feature (auth, chat, settings, UI).
- **context/** — React context providers for cross-cutting state (chat, reply bubbles).
- **hooks/** — Feature-scoped hooks for auth, chat, security, network, and UI logic.
- **layouts/** — App-level layouts that compose shared structure like sidebars and auth shells.
- **pages/** — Route-level screens for auth, chat, and landing views.
- **services/** — API and Web3 service clients (wallet, contacts, relay APIs).
- **store/** — State management and persistence helpers (Zustand stores and session state).
- **utils/** — Low-level utilities for crypto, storage, network, media, and platform glue.

### Zero Data Retention + WebRTC Tunneling (Client Flow)

- ✅ The client **never posts messages to the relay**. It uses the relay only to exchange WebRTC offers/answers and ephemeral ECDH keys.
- ✅ After the handshake, peers derive a **session AES-256 key** locally and drop the relay from the data path.
- ✅ All message payloads are **encrypted locally** before transmission and decrypted only on the recipient device.
- ✅ Chat history is stored **locally in IndexedDB** and can be encrypted/exported; no server-side persistence exists.
- ✅ If the relay disconnects, the **P2P data channel remains active** as long as both peers stay connected.

## 🚀 Installation & Setup

### Prerequisites

- Node.js (v18+)
- Redis Server (Running on default port `6379`)
- Ganache CLI (`npm install -g ganache`)
- PM2 (`npm install -g pm2`) — for production
- Nginx — for production

---

### 1. Smart Contract Setup

Deploy the registry contract using your preferred environment:

**Option A: Using Hardhat**

```bash
cd apps/contracts
npm install
npx hardhat compile
npx hardhat node
npx hardhat run scripts/deploy.ts --network localhost
```

**Option B: Using Truffle**

```bash
cd apps/contracts
npm install
npm run migrate:dev             # run database migrations in development mode
npm run migrate:dev -- --reset  # reset the database and re-run all migrations
```

---

### 2. Running Services

#### 🧪 Development

Run each service manually in separate terminals:

```bash
# Ganache (local EVM)
ganache -h 127.0.0.1 -p 8545 -m "check tongue that exhaust miss voyage maple velvet wheel learn food scare"

# Relay Server 1
cd apps/relay-server
npm run start:relay1

# Relay Server 2
cd apps/relay-server
npm run start:relay2

# Client
cd apps/client
npm run dev
```

The client will be available at `http://localhost:5173`.

---

#### 🚀 Production (PM2 + Nginx)

Use PM2 to keep all backend services alive in the background.

**Start services with PM2:**

```bash
# Ganache
pm2 start ganache --name "ganache" -- -h 0.0.0.0 -p 8545 -m "check tongue that exhaust miss voyage maple velvet wheel learn food scare"

# Relay Server 1
pm2 start npm --name "relay1" -- run start:relayprod1

# Relay Server 2
pm2 start npm --name "relay2" -- run start:relayprod2
```

**Build & serve the client via Nginx:**

```bash
cd apps/client
npm run build
# Output goes to dist/, served by Nginx (see below)
```

**Save PM2 process list & enable auto-start on reboot:**

```bash
pm2 save
pm2 startup
```

**Useful PM2 commands:**

```bash
pm2 status          # show all running processes
pm2 logs            # display logs for all processes
pm2 logs ganache    # display logs for a specific process (ganache)
pm2 restart all     # restart all processes
pm2 stop all        # stop all processes
```

---

### 3. Nginx Setup (Production)

Nginx serves the built client and handles HTTPS via self-signed certificate.

**Generate self-signed certificate:**

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/selfsigned.key \
  -out /etc/ssl/certs/selfsigned.crt \
  -subj "/CN=10.64.24.248" \
  -addext "subjectAltName=IP:10.64.24.248"
```

**Nginx config** is located at `chat-app/apps/config/nginx.conf`. The config covers:

- Port **80** → redirect to HTTPS
- Port **443** → serve React/Vite client
- Port **4431–4433** → SSL reverse proxy to each relay node (3001–3003)

**Apply config:**

```bash
# Backup & copy config from repo
sudo cp /etc/nginx/sites-available/chat-app /etc/nginx/sites-available/chat-app.bak
sudo cp /home/thesis/rizki/skripsi-Chat-APP/config/nginx.conf /etc/nginx/sites-available/chat-app

# Symlink to sites-enabled already exists, test & reload directly
sudo nginx -t && sudo systemctl reload nginx
```

> **Note**: Your browser may display a "Not Secure" warning because a self-signed certificate is being used. Click **Advanced → Proceed** to continue. After that, microphone and camera access should work normally since the connection is already using HTTPS.

---

## 💻 Usage Guide

1.  **Register**: Create a new identity. Save the generated 12-word Seed Phrase securely.
2.  **Network Node**: Select a default relay or click the `+` icon to add a custom relay URL.
3.  **Connect**: Enter a target username in the sidebar and click "Connect & Handshake".
4.  **Accept**: The receiving user must accept the incoming handshake request.
5.  **Chat**: Once the "AES-256 Secured" badge appears, you can send texts and images directly via WebRTC.

## 🔐 Security Disclaimer

This application is developed as an academic prototype for a university thesis. While it implements industry-standard cryptographic libraries, the smart contracts and signaling logic have not undergone professional security audits.

---

## Environment Variables (.env)

Create a `.env` file in each workspace with the following minimum structure.

**apps/relay-server/.env**

```env
PORT=3001
REDIS_URL=redis://127.0.0.1:6379
RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
RELAY_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
```

**apps/client/.env**

```env
VITE_DEFAULT_RELAY_URL=https://relay-1.example.com
VITE_RPC_URL=http://127.0.0.1:8545
VITE_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
```

## Testing Guide

**Smart Contracts (Hardhat):**

```bash
cd apps/blockchain
npm test
```

**Client (Vitest):**

```bash
cd apps/client
npm run test
```

## Custom Non-Commercial & Absolute Privacy License

**Rule 1 (Non-Commercial):** You may study, modify, and distribute this code for community or academic research purposes. You are strictly forbidden to sell, re-license, or monetize the application or any derivative work in any form.

**Rule 2 (Absolute Decentralization / Zero Data Retention Clause):** This repository is explicitly built for zero data retention. You are strictly forbidden to modify the server code to add any central database (such as MySQL or MongoDB) or to create endpoints designed to intercept, store, or track user message history, media, or cryptographic keys. User privacy is non-negotiable.

_Developed with ☕ by kakonoomoide_
