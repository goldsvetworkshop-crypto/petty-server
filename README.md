# :shield: @goldsvetworkshop/petty-server

> **Server-side HTTP 402 middleware for monetizing APIs with autonomous AI micro-payments.**  
> Built for Base L2, Viem, and Express.js.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@goldsvetworkshop/petty-server.svg?style=flat-square)](https://www.npmjs.com/package/@goldsvetworkshop/petty-server)

---

## :zap: What is this?

`@goldsvetworkshop/petty-server` is the seller-side counterpart to `@goldsvetworkshop/petty`. 

It allows any API developer to put an **`HTTP 402 Payment Required`** paywall on their API endpoints in **3 lines of code**. It intercepts incoming requests, validates EIP-712 payment vouchers signed by AI agents, verifies RFC 8785 request body hashes, and prevents replay attacks.

---

## :package: Installation

```bash
npm install @goldsvetworkshop/petty-server viem express
:rocket: Quickstart: Monetize an API Route
code
TypeScript
import express from "express";
import { pettyPaywall } from "@goldsvetworkshop/petty-server";

const app = express();
app.use(express.json());

// Protect an endpoint with a 0.10 USDC paywall on Base
app.post("/api/market-data", pettyPaywall({
  price: "100000",                                             // 0.10 USDC (6 decimals)
  recipient: "0x2506F46A6D95c249E69e160eB698dF1991Fbe45C",    // Your merchant payout wallet
  tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC
  verifyingGateway: "0x0000000000000000000000000000000000000001",
  chainId: 8453,                                                // Base Mainnet
  onPaymentReceived: (receipt) => {
    console.log(`Payment confirmed: ${receipt.amount} from ${receipt.signer}`);
  }
}), (req, res) => {
  res.json({
    success: true,
    data: "Premium AI intelligence unlocked!"
  });
});

app.listen(3000, () => console.log("Monetized API running on port 3000"));
:lock: Security Features
Anti-Replay Protection: In-memory signature store ensures vouchers cannot be double-spent.
RFC 8785 Canonical JCS: Verifies the cryptographic hash of the exact request body across Python, Go, and Node clients.
EIP-712 Structured Verification: Verifies signatures cryptographically using viem/verifyTypedData.
:page_facing_up: License
MIT (c) 2026 goldsvetworkshop-crypto
