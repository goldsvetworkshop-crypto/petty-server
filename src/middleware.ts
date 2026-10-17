import { Request, Response, NextFunction } from "express";
import {
  getAddress,
  isAddressEqual,
  keccak256,
  toHex,
  verifyTypedData,
  type Address,
  type Hex
} from "viem";
import { PaywallOptions, EIP712_PAYMENT_TYPES, VerifiedPaymentReceipt } from "./types.js";
import { canonicalize } from "./canonical.js";
import { MemoryNonceStore } from "./store.js";

const defaultNonceStore = new MemoryNonceStore();

export function pettyPaywall(options: PaywallOptions) {
  const recipient = getAddress(options.recipient);
  const tokenAddress = getAddress(options.tokenAddress);
  const requiredAmount = BigInt(options.price);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const signature = req.headers["x-payment-signature"] as Hex | undefined;
    const signer = req.headers["x-payment-signer"] as Address | undefined;
    const nonce = req.headers["x-payment-nonce"] as string | undefined;
    const token = req.headers["x-payment-token"] as Address | undefined;
    const clientRequestHash = req.headers["x-payment-requesthash"] as Hex | undefined;

    // 1. If headers are missing, issue HTTP 402 Challenge
    if (!signature || !signer || !nonce || !token || !clientRequestHash) {
      res.setHeader("x-payment-address", recipient);
      res.setHeader("x-payment-amount", options.price);
      res.setHeader("x-payment-token", tokenAddress);
      res.setHeader("x-payment-chain-id", options.chainId.toString());
      res.setHeader("x-payment-gateway", options.verifyingGateway);

      res.status(402).json({
        error: "Payment Required",
        price: options.price,
        recipient,
        tokenAddress,
        chainId: options.chainId,
        message: "Attach a valid Petty EIP-712 payment voucher to access this resource."
      });
      return;
    }

    try {
      // 2. Anti-Replay Check
      if (defaultNonceStore.hasBeenUsed(signature)) {
        res.status(403).json({ error: "Forbidden: Payment voucher has already been redeemed." });
        return;
      }

      // 3. Asset & Recipient Verification
      if (!isAddressEqual(getAddress(token), tokenAddress)) {
        res.status(400).json({ error: "Invalid payment token address." });
        return;
      }

      // 4. Recompute Canonical Request Hash to ensure body was not tampered with
      const canonicalPayload = req.body ? canonicalize(req.body) : "";
      const method = req.method.toUpperCase();
      const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl || req.url}`;
      const serverComputedHash = keccak256(toHex(`${method}:${fullUrl}:${canonicalPayload}`));

      if (serverComputedHash !== clientRequestHash) {
        res.status(403).json({
          error: "Cryptographic Mismatch: Request hash does not match signature.",
          expected: serverComputedHash,
          received: clientRequestHash
        });
        return;
      }

      // 5. Cryptographic EIP-712 Signature Verification
      const isValid = await verifyTypedData({
        address: getAddress(signer),
        domain: {
          name: "Petty-x402-Gateway",
          version: "1",
          chainId: options.chainId,
          verifyingContract: options.verifyingGateway
        },
        types: EIP712_PAYMENT_TYPES,
        primaryType: "PaymentVoucher",
        message: {
          token: tokenAddress,
          recipient,
          amount: requiredAmount,
          nonce: BigInt(nonce),
          validUntil: BigInt(Math.floor(Date.now() / 1000) + 3600), // Verification window
          requestHash: serverComputedHash
        },
        signature
      });

      if (!isValid) {
        res.status(401).json({ error: "Unauthorized: Invalid cryptographic payment signature." });
        return;
      }

      // 6. Mark voucher as used & record receipt
      defaultNonceStore.markUsed(signature);

      const receipt: VerifiedPaymentReceipt = {
        signer: getAddress(signer),
        recipient,
        token: tokenAddress,
        amount: options.price,
        nonce,
        requestHash: serverComputedHash,
        signature,
        timestamp: Date.now()
      };

      if (options.onPaymentReceived) {
        await options.onPaymentReceived(receipt);
      }

      // Attach payment metadata to the Express Request
      (req as any).petty = receipt;

      // Payment verified! Proceed to API handler
      next();
    } catch (err: any) {
      res.status(500).json({ error: "Payment verification error", details: err.message });
    }
  };
}
