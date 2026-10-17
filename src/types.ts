import { type Address, type Hex } from "viem";

export const EIP712_PAYMENT_TYPES = {
  PaymentVoucher: [
    { name: "token", type: "address" },
    { name: "recipient", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "validUntil", type: "uint256" },
    { name: "requestHash", type: "bytes32" }
  ]
} as const;

export interface PaywallOptions {
  price: string;                   // Price in atomic units (e.g. "100000" for 0.10 USDC)
  recipient: Address;              // Merchant payout address
  tokenAddress: Address;           // e.g. Base USDC
  verifyingGateway: Address;       // Settlement contract
  chainId: number;                 // e.g. 8453 for Base Mainnet
  onPaymentReceived?: (receipt: VerifiedPaymentReceipt) => void | Promise<void>;
}

export interface VerifiedPaymentReceipt {
  signer: Address;
  recipient: Address;
  token: Address;
  amount: string;
  nonce: string;
  requestHash: Hex;
  signature: Hex;
  timestamp: number;
}
