<div align="center">
  <img src="https://dummyimage.com/800x200/09090b/4f46e5.png&text=SecureP2P+Chat" alt="SecureP2P Banner" width="100%" style="border-radius: 12px;"/>
  
  <br/>
  <br/>

  <img src="https://img.shields.io/badge/React-18.0-blue?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/WebRTC-P2P_Tunnel-FF6600?style=for-the-badge&logo=webrtc&logoColor=white" alt="WebRTC" />
  <img src="https://img.shields.io/badge/Solidity-Smart_Contract-363636?style=for-the-badge&logo=solidity&logoColor=white" alt="Solidity" />
  <img src="https://img.shields.io/badge/Ethers.js-Web3-2748A5?style=for-the-badge&logo=ethereum&logoColor=white" alt="Ethers.js" />

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
pm2 start ganache --name "ganache" -- -h 127.0.0.1 -p 8545 -m "check tongue that exhaust miss voyage maple velvet wheel learn food scare"

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

_Developed with ☕ by kakonoomoide_
