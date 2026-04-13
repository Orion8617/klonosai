// ─── Solana Pay auto-verification ────────────────────────────────────────────
//
//  POST /api/payments/solana/verify
//  Body: { signature: string, plan: string, planUsdPrice: number, senderAddress?: string }
//  Returns: { verified: boolean, plan?: string, activatedAt?: number, error?: string }
//
// ── Helius webhook upgrade path ───────────────────────────────────────────────
//  For production you can replace the pull-based RPC check with Helius push:
//  1. Create a webhook at https://dev.helius.xyz targeting POST /api/payments/solana/webhook
//  2. Set wallet address HUAiWhbJiX8WQTZJ8m139RYdDHjhq9pfSm5yH54xAfEt as the monitored address
//  3. On each POST from Helius, look up the matching pending payment (by amount / memo),
//     mark it as activated in your DB, and push a SSE/WS event to the waiting client.
//  This gives ~instant activation without polling and works even when the browser tab is closed.

import { Router, type Request, type Response } from "express";

const router = Router();

// ── Constants ─────────────────────────────────────────────────────────────────
const RECIPIENT     = "HUAiWhbJiX8WQTZJ8m139RYdDHjhq9pfSm5yH54xAfEt";
const LAMPORTS_PER_SOL = 1_000_000_000;
const TOLERANCE     = 0.98;            // accept amounts within 2% of expected
const SOL_PRICE_REF = 120;             // $ per SOL reference (same as client)
const RPC_URL       = "https://api.mainnet-beta.solana.com";
const MAX_RETRIES   = 3;
const RETRY_DELAY   = 800;             // ms

// ── Plan price table (server-side canonical) ──────────────────────────────────
const PLAN_PRICES: Record<string, number> = {
  "Free":       0,
  "Pro":        4.99,
  "Drosophila": 99,
  "Enterprise": 299,
};

// ── Solana RPC types ──────────────────────────────────────────────────────────
interface SolanaRpcResponse {
  result: SolanaTransaction | null;
  error?: { code: number; message: string };
}

interface SolanaTransaction {
  blockTime: number | null;
  confirmationStatus?: "processed" | "confirmed" | "finalized";
  meta: {
    err: Record<string, unknown> | null;
    fee: number;
    preBalances:  number[];
    postBalances: number[];
  } | null;
  transaction: {
    message: {
      accountKeys: string[];
    };
    signatures: string[];
  };
  version?: string | number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTransaction(signature: string): Promise<SolanaRpcResponse> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "getTransaction",
    params: [
      signature,
      {
        encoding: "json",
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      },
    ],
  });

  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`RPC HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json() as Promise<SolanaRpcResponse>;
}

// ── Route ─────────────────────────────────────────────────────────────────────
router.post("/solana/verify", async (req: Request, res: Response) => {
  const { signature, plan, planUsdPrice } = req.body as {
    signature?:    string;
    plan?:         string;
    planUsdPrice?: number;
  };

  // ── 1. Input validation ────────────────────────────────────────────────────
  if (!signature || typeof signature !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(signature)) {
    res.status(400).json({ verified: false, error: "Invalid transaction signature format." });
    return;
  }

  const planName = plan ?? "Unknown";
  const canonicalPrice = PLAN_PRICES[planName];

  // Derive expected USD price: prefer canonical server price, fallback to client-supplied
  const usdPrice = canonicalPrice !== undefined ? canonicalPrice : (typeof planUsdPrice === "number" ? planUsdPrice : 0);

  if (usdPrice === 0) {
    // Free plan — nothing to verify
    res.json({ verified: true, plan: planName, activatedAt: Date.now(), note: "Free plan — no payment required." });
    return;
  }

  const expectedLamports = Math.round((usdPrice / SOL_PRICE_REF) * LAMPORTS_PER_SOL);
  const minimumLamports  = Math.round(expectedLamports * TOLERANCE);

  // ── 2. Fetch TX from Solana RPC (with retries) ────────────────────────────
  let rpcData: SolanaRpcResponse | null = null;
  let lastRpcErr: string = "";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      rpcData = await fetchTransaction(signature);
      if (rpcData.result !== null) break;         // got the TX, stop retrying
      // null result = not yet propagated; wait and retry
      if (attempt < MAX_RETRIES - 1) await sleep(RETRY_DELAY * (attempt + 1));
    } catch (e) {
      lastRpcErr = e instanceof Error ? e.message : String(e);
      if (attempt < MAX_RETRIES - 1) await sleep(RETRY_DELAY);
    }
  }

  if (!rpcData) {
    res.status(502).json({ verified: false, error: `Solana RPC unreachable: ${lastRpcErr}. Try the manual email fallback.` });
    return;
  }

  if (rpcData.error) {
    res.status(502).json({ verified: false, error: `RPC error: ${rpcData.error.message}` });
    return;
  }

  const tx = rpcData.result;
  if (tx === null) {
    res.json({ verified: false, error: "Transaction not found on-chain yet. Wait a few seconds and try again, or use the email fallback." });
    return;
  }

  // ── 3. Check transaction status ───────────────────────────────────────────
  if (tx.meta === null) {
    res.json({ verified: false, error: "Transaction has no metadata — it may still be processing." });
    return;
  }

  if (tx.meta.err !== null) {
    res.json({ verified: false, error: "Transaction was rejected on-chain (it failed). Please retry the payment." });
    return;
  }

  // ── 4. Verify recipient is in the account keys ────────────────────────────
  const accountKeys: string[] = tx.transaction.message.accountKeys;
  const recipientIdx = accountKeys.findIndex(k => k === RECIPIENT);

  if (recipientIdx === -1) {
    res.json({ verified: false, error: `Recipient mismatch — payment was not sent to the ZeroLag wallet. Expected: ${RECIPIENT.slice(0, 8)}…` });
    return;
  }

  // ── 5. Verify amount received ─────────────────────────────────────────────
  const preBalance  = tx.meta.preBalances[recipientIdx]  ?? 0;
  const postBalance = tx.meta.postBalances[recipientIdx] ?? 0;
  const lamportsReceived = postBalance - preBalance;

  if (lamportsReceived < minimumLamports) {
    const receivedSol  = (lamportsReceived  / LAMPORTS_PER_SOL).toFixed(6);
    const expectedSol  = (expectedLamports  / LAMPORTS_PER_SOL).toFixed(6);
    res.json({
      verified: false,
      error: `Amount too low: received ${receivedSol} SOL, expected ≥${expectedSol} SOL (${usdPrice} USD at ref rate $${SOL_PRICE_REF}/SOL with 2% tolerance). Please top up and email the TX hash.`,
    });
    return;
  }

  // ── 6. All checks passed — activate plan ──────────────────────────────────
  // Log server-side (in production you'd persist this to DB / activate subscription)
  console.log(`[payments] SOL plan activated: plan=${planName} signature=${signature.slice(0, 16)}… lamports=${lamportsReceived}`);

  res.json({
    verified:    true,
    plan:        planName,
    activatedAt: Date.now(),
    lamportsReceived,
    solReceived: (lamportsReceived / LAMPORTS_PER_SOL).toFixed(6),
  });
});

export default router;
