import { Router, type Request, type Response } from "express";
import { Connection, PublicKey } from "@solana/web3.js";

const router = Router();

const RECIPIENT      = "HUAiWhbJiX8WQTZJ8m139RYdDHjhq9pfSm5yH54xAfEt";
const LAMPORTS_PER_SOL = 1_000_000_000;
const TOLERANCE      = 0.98;
const SOL_PRICE_REF  = 120;
const RPC_URL        = "https://api.mainnet-beta.solana.com";
const MAX_RETRIES    = 3;
const RETRY_DELAY_MS = 800;

// Server-canonical pricing — never trust client-supplied amounts.
const PLAN_PRICES: Record<string, number> = {
  "Free":       0,
  "Pro":        4.99,
  "Drosophila": 99,
  "Enterprise": 299,
};

// Helius webhook upgrade path: create a webhook at https://dev.helius.xyz targeting
// POST /api/payments/solana/webhook, monitor RECIPIENT, mark the matching pending payment
// activated in DB, and push SSE to the waiting client — gives instant activation without polling.

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

router.post("/solana/verify", async (req: Request, res: Response) => {
  const { signature, plan, senderAddress } = req.body as {
    signature?:     string;
    plan?:          string;
    senderAddress?: string;
  };

  if (!signature || typeof signature !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(signature)) {
    res.status(400).json({ verified: false, error: "Invalid transaction signature format." });
    return;
  }

  const planName = typeof plan === "string" ? plan.trim() : "";
  if (!(planName in PLAN_PRICES)) {
    res.status(400).json({ verified: false, error: `Unknown plan: "${planName}". Valid plans: ${Object.keys(PLAN_PRICES).join(", ")}.` });
    return;
  }

  const usdPrice = PLAN_PRICES[planName]!;
  if (usdPrice === 0) {
    res.json({ verified: true, plan: planName, activatedAt: Date.now() });
    return;
  }

  const expectedLamports = Math.round((usdPrice / SOL_PRICE_REF) * LAMPORTS_PER_SOL);
  const minimumLamports  = Math.round(expectedLamports * TOLERANCE);

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
    res.json({ verified: false, error: "Transaction not found as finalized yet. Wait ~30 s and try again, or email us the TX hash." });
    return;
  }

  if (tx.meta === null) {
    res.json({ verified: false, error: "Transaction metadata unavailable — it may still be processing." });
    return;
  }

  if (tx.meta.err !== null) {
    res.json({ verified: false, error: "Transaction was rejected on-chain. Please retry the payment." });
    return;
  }

  const rawMsg = tx.transaction.message;
  const accountKeys: PublicKey[] = "staticAccountKeys" in rawMsg
    ? rawMsg.staticAccountKeys
    : rawMsg.accountKeys;

  // Validate sender identity to prevent signature reuse across users.
  if (senderAddress) {
    const senderPubkey = new PublicKey(senderAddress);
    if (accountKeys.length === 0 || !accountKeys[0]!.equals(senderPubkey)) {
      res.json({ verified: false, error: "Sender mismatch — transaction was not signed by your wallet." });
      return;
    }
  }

  const recipientPubkey = new PublicKey(RECIPIENT);
  const recipientIdx    = accountKeys.findIndex(k => k.equals(recipientPubkey));

  if (recipientIdx === -1) {
    res.json({ verified: false, error: `Recipient mismatch — payment was not sent to the ZeroLag wallet. Expected: ${RECIPIENT.slice(0, 8)}…` });
    return;
  }

  const preBalance       = tx.meta.preBalances[recipientIdx]  ?? 0;
  const postBalance      = tx.meta.postBalances[recipientIdx] ?? 0;
  const lamportsReceived = postBalance - preBalance;

  if (lamportsReceived < minimumLamports) {
    const receivedSol = (lamportsReceived / LAMPORTS_PER_SOL).toFixed(6);
    const expectedSol = (expectedLamports / LAMPORTS_PER_SOL).toFixed(6);
    res.json({ verified: false, error: `Amount too low: received ${receivedSol} SOL, expected ≥${expectedSol} SOL ($${usdPrice} at ref $${SOL_PRICE_REF}/SOL with 2% tolerance). Email the TX hash to activate.` });
    return;
  }

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
