// ─── Solana Pay auto-verification ────────────────────────────────────────────
//
//  POST /api/payments/solana/verify
//  Body: { signature: string, plan: string, planUsdPrice?: number }
//  Returns: { verified: boolean, plan?: string, activatedAt?: number, error?: string }
//
// ── Helius webhook upgrade path (README) ──────────────────────────────────────
//  For production replace the poll-based RPC check with Helius push:
//  1. Create a webhook at https://dev.helius.xyz targeting POST /api/payments/solana/webhook
//  2. Set wallet address HUAiWhbJiX8WQTZJ8m139RYdDHjhq9pfSm5yH54xAfEt as the monitored address
//  3. On each POST from Helius, look up the pending payment by amount/memo,
//     mark it as activated in your DB, and push an SSE/WS event to the waiting client.
//  This gives ~instant activation without polling and works even when the browser tab is closed.

import { Router, type Request, type Response } from "express";
import { Connection, PublicKey } from "@solana/web3.js";

const router = Router();

// ── Constants ─────────────────────────────────────────────────────────────────
const RECIPIENT      = "HUAiWhbJiX8WQTZJ8m139RYdDHjhq9pfSm5yH54xAfEt";
const LAMPORTS_PER_SOL = 1_000_000_000;
const TOLERANCE      = 0.98;             // accept amounts within 2% of expected
const SOL_PRICE_REF  = 120;              // $ per SOL reference (same as client)
const RPC_URL        = "https://api.mainnet-beta.solana.com";
const MAX_RETRIES    = 3;
const RETRY_DELAY_MS = 800;              // ms between retries

// ── Server-canonical plan price table (client values are never trusted) ────────
const PLAN_PRICES: Record<string, number> = {
  "Free":       0,
  "Pro":        4.99,
  "Drosophila": 99,
  "Enterprise": 299,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Route ─────────────────────────────────────────────────────────────────────
router.post("/solana/verify", async (req: Request, res: Response) => {
  const { signature, plan } = req.body as {
    signature?: string;
    plan?:      string;
  };

  // ── 1. Signature format validation ────────────────────────────────────────
  if (
    !signature ||
    typeof signature !== "string" ||
    !/^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(signature)
  ) {
    res.status(400).json({ verified: false, error: "Invalid transaction signature format." });
    return;
  }

  // ── 2. Plan validation (server-canonical only — no client price fallback) ─
  const planName = typeof plan === "string" ? plan.trim() : "";
  if (!(planName in PLAN_PRICES)) {
    res.status(400).json({ verified: false, error: `Unknown plan: "${planName}". Valid plans: ${Object.keys(PLAN_PRICES).join(", ")}.` });
    return;
  }

  const usdPrice = PLAN_PRICES[planName]!;

  // Free plan — no payment required
  if (usdPrice === 0) {
    res.json({ verified: true, plan: planName, activatedAt: Date.now(), note: "Free plan — no payment required." });
    return;
  }

  const expectedLamports = Math.round((usdPrice / SOL_PRICE_REF) * LAMPORTS_PER_SOL);
  const minimumLamports  = Math.round(expectedLamports * TOLERANCE);

  // ── 3. Connect to Solana and fetch the finalized transaction ──────────────
  //  Uses @solana/web3.js Connection.getTransaction() with "finalized" commitment.
  //  We retry up to MAX_RETRIES times because freshly submitted transactions can
  //  take a few seconds to appear as finalized on the RPC node.
  const connection = new Connection(RPC_URL, "finalized");
  let tx: Awaited<ReturnType<Connection["getTransaction"]>> | undefined = undefined;
  let lastErr = "";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      tx = await connection.getTransaction(signature, {
        commitment: "finalized",
        maxSupportedTransactionVersion: 0,
      });
      if (tx !== null) break;
      // null = not finalized yet; wait and retry
      if (attempt < MAX_RETRIES - 1) await sleep(RETRY_DELAY_MS * (attempt + 1));
    } catch (e: unknown) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (attempt < MAX_RETRIES - 1) await sleep(RETRY_DELAY_MS);
    }
  }

  if (tx === undefined) {
    res.status(502).json({ verified: false, error: `Solana RPC unreachable: ${lastErr}. Please use the manual email fallback.` });
    return;
  }

  if (tx === null) {
    res.json({
      verified: false,
      error: "Transaction not found as finalized on-chain yet. Wait ~30 s for finalization and try again, or use the email fallback.",
    });
    return;
  }

  // ── 4. Verify the transaction did not fail on-chain ───────────────────────
  if (tx.meta === null) {
    res.json({ verified: false, error: "Transaction has no metadata — it may still be processing." });
    return;
  }

  if (tx.meta.err !== null) {
    res.json({ verified: false, error: "Transaction was rejected on-chain (failed). Please retry the payment." });
    return;
  }

  // ── 5. Verify recipient is among the account keys ─────────────────────────
  //  For legacy transactions, message.accountKeys is PublicKey[].
  //  For versioned transactions (maxSupportedTransactionVersion:0), the VersionedMessage
  //  type has staticAccountKeys. We handle both via type narrowing.
  const rawMsg = tx.transaction.message;
  const accountKeys: PublicKey[] = "staticAccountKeys" in rawMsg
    ? rawMsg.staticAccountKeys
    : rawMsg.accountKeys;

  const recipientPubkey = new PublicKey(RECIPIENT);
  const recipientIdx    = accountKeys.findIndex(k => k.equals(recipientPubkey));

  if (recipientIdx === -1) {
    res.json({
      verified: false,
      error: `Recipient mismatch — payment was not sent to the ZeroLag wallet. Expected: ${RECIPIENT.slice(0, 8)}…`,
    });
    return;
  }

  // ── 6. Verify lamports received by the recipient ──────────────────────────
  const preBalance       = tx.meta.preBalances[recipientIdx]  ?? 0;
  const postBalance      = tx.meta.postBalances[recipientIdx] ?? 0;
  const lamportsReceived = postBalance - preBalance;

  if (lamportsReceived < minimumLamports) {
    const receivedSol = (lamportsReceived  / LAMPORTS_PER_SOL).toFixed(6);
    const expectedSol = (expectedLamports  / LAMPORTS_PER_SOL).toFixed(6);
    res.json({
      verified: false,
      error: `Amount too low: received ${receivedSol} SOL, expected ≥${expectedSol} SOL ($${usdPrice} USD at ref $${SOL_PRICE_REF}/SOL with 2% tolerance). Please top up and email the TX hash.`,
    });
    return;
  }

  // ── 7. All checks passed — plan activated ────────────────────────────────
  // In production: persist activation to DB here; for MVP, log server-side only.
  console.log(`[payments] plan activated plan=${planName} sig=${signature.slice(0, 16)}… lamports=${lamportsReceived}`);

  res.json({
    verified:        true,
    plan:            planName,
    activatedAt:     Date.now(),
    lamportsReceived,
    solReceived:     (lamportsReceived / LAMPORTS_PER_SOL).toFixed(6),
  });
});

export default router;
