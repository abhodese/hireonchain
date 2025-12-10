# Statement of Work (SOW)

## 1. Smart Contract

- **Refactor** the existing contract using the Anchor framework, maintaining compatibility with the current wallet logic and API integration
- If major limitations are found, we're open to a **clean rebuild** with clear documentation
- **System Architecture:**
  - Refactor around a Rust-based **Actix Web backend** for maximum speed, security, and scalability
  - **Dockerized infrastructure** with isolated services:
    - API gateway
    - Solana indexer
    - Database
    - Frontend
  - Bulletproof disaster recovery
- **Core Escrow Logic:**
  - Secure, Anchor-based Solana smart contracts
  - PDA-controlled vaults
  - Strict signer validation
  - On-chain event emissions for real-time updates
- **Dedicated Rust Service:**
  - Transaction construction
  - KMS-backed signing
  - Synchronization of escrow state from blockchain into MongoDB

---

## 2. Back-End

- **Multiple flows:** contract, jobs, user, and authentication
- Each module will be **tested separately** to ensure proper functionality
- **Issue:** Current code lacks proper separation of concerns (SoC) with tightly coupled components
- **Action needed:** Address coupling for better maintainability and scalability

---

## 3. Front-End

### Goals
- **Light redesign** — updated layouts and improved usability (not a complete rebuild)
- Focus on performance, clarity, and modern feel while preserving core structure

### Current Status

**✅ Complete:**
- Basic UI: All pages render (Home, Login, Register, Dashboard, etc.)
- Routing: React Router navigation working
- Forms: Registration and login forms functional

**⚠️ Incomplete:**
- Job Posting: Form exists but escrow integration incomplete
- Proposal Submission: Basic form, needs escrow funding
- Contract Management: UI exists, blockchain integration missing

---

## 4. Blockchain Integration

**✅ Complete:**
- Smart Contract: Escrow program compiled and ready
- Wallet Connection: Frontend connects to Solana wallets

**⚠️ Incomplete:**
- Escrow Creation: Basic functions exist, needs UI integration
- Fund Transfer: Transaction logic implemented, needs triggers
- Payment Release: Release functions ready, needs completion flow

---

## 5. Real-Time Updates

- Use **Socket.io (WebSocket)** for live job and payment status updates
- Open to alternative suggestions for better scalability

### Current Status
**❌ Not Implemented:**
- WebSocket Integration: Socket.io installed but not used
- Live Updates: No real-time notifications
- Chat System: No messaging between users

---

## 6. Optimized Mobile Performance

*(To be implemented)*

---

## 7. Environment Setup

- **Current:** Devnet and MongoDB instances available
- **Requested:** Help setting up a **staging server** to streamline testing and collaboration