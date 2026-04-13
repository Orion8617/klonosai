// ─── CryptoPayModal — Phantom (Solana) + Ethereum payments ──────────────────
//
//  Wallets:
//    SOL  HUAiWhbJiX8WQTZJ8m139RYdDHjhq9pfSm5yH54xAfEt
//    ETH  0x44094e81f58e22e6db2cf9075585432ec72c8c31

import { useEffect, useState, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { createPhantom, type Phantom } from "@phantom/wallet-sdk";

// ── Wallet addresses ─────────────────────────────────────────────────────────
const SOL_WALLET = "HUAiWhbJiX8WQTZJ8m139RYdDHjhq9pfSm5yH54xAfEt";
const ETH_WALLET = "0x44094e81f58e22e6db2cf9075585432ec72c8c31";

// ── Plan price table ──────────────────────────────────────────────────────────
const PLAN_PRICES: Record<string, { usd: number }> = {
  "Free":       { usd: 0    },
  "Pro":        { usd: 4.99 },
  "Drosophila": { usd: 99   },
  "Enterprise": { usd: 299  },
};

// ── Solana RPC ────────────────────────────────────────────────────────────────
const SOL_PRICE_REF = 120;
const ETH_PRICE_REF = 2500;

// ── API base (same-origin, routed via proxy) ──────────────────────────────────
const VERIFY_URL = "/api-server/api/payments/solana/verify";

// ── Helpers ───────────────────────────────────────────────────────────────────
function solanaPayURI(amount: number, label: string): string {
  const params = new URLSearchParams({
    label,
    message: `ZeroLag ${label} subscription`,
  });
  if (amount > 0) params.set("amount", amount.toString());
  return `solana:${SOL_WALLET}?${params.toString()}`;
}

function shortAddr(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-5)}` : addr;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Chain    = "sol" | "eth";
type TxStatus = "idle" | "connecting" | "sending" | "verifying" | "success" | "error";
type ActivationStatus = "pending" | "verified" | "email-fallback";

interface Props {
  open: boolean;
  plan: string;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function CryptoPayModal({ open, plan, onClose }: Props) {
  const [chain,      setChain]      = useState<Chain>("sol");
  const [status,     setStatus]     = useState<TxStatus>("idle");
  const [activation, setActivation] = useState<ActivationStatus>("pending");
  const [solAddr,    setSolAddr]    = useState("");
  const [ethAddr,    setEthAddr]    = useState("");
  const [txSig,      setTxSig]      = useState("");
  const [errMsg,     setErrMsg]     = useState("");
  const [copied,     setCopied]     = useState(false);
  const phantomRef = useRef<Phantom | null>(null);

  const price    = PLAN_PRICES[plan] ?? { usd: 0 };
  const approxSol = price.usd > 0 ? +(price.usd / SOL_PRICE_REF).toFixed(4) : 0;
  const approxEth = price.usd > 0 ? +(price.usd / ETH_PRICE_REF).toFixed(5) : 0;

  // ── Lock scroll & ESC ──────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      createPhantom({
        zIndex: 9999,
        hideLauncherBeforeOnboarded: true,
        colorScheme: "dark",
      }).then(p => { phantomRef.current = p; }).catch(() => {});
    } else {
      document.body.style.overflow = "";
      setStatus("idle");
      setActivation("pending");
      setSolAddr(""); setEthAddr(""); setTxSig(""); setErrMsg("");
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  // ── Resolve Solana provider ─────────────────────────────────────────────────
  const getSolProv = useCallback(() => {
    const ext = (window as { phantom?: { solana?: unknown } }).phantom?.solana ??
                (window as { solana?: { isPhantom?: boolean } }).solana;
    if (ext) return ext as {
      isPhantom: boolean;
      connect: (o?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
      signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }>;
      publicKey: PublicKey | null;
    };
    return (phantomRef.current?.solana as typeof ext | undefined) ?? null;
  }, []);

  // ── Resolve Ethereum provider ──────────────────────────────────────────────
  const getEthProv = useCallback(() => {
    const w = window as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> }; phantom?: { ethereum?: unknown } };
    return w.phantom?.ethereum ?? w.ethereum ?? (phantomRef.current?.ethereum as typeof w.ethereum | undefined) ?? null;
  }, []);

  // ── Auto-verify SOL transaction on-chain ──────────────────────────────────
  const verifySolTx = useCallback(async (signature: string, sender: string) => {
    setStatus("verifying");
    try {
      const res = await fetch(VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ signature, plan, senderAddress: sender }),
      });
      const data = await res.json() as { verified: boolean; error?: string };
      if (data.verified) {
        setActivation("verified");
      } else {
        // Verification failed — fall back to manual email
        setActivation("email-fallback");
        setErrMsg(data.error ?? "On-chain verification failed — please email us your TX hash.");
      }
    } catch {
      setActivation("email-fallback");
      setErrMsg("Could not reach verification server — please email us your TX hash.");
    }
    setStatus("success");
  }, [plan, price.usd]);

  // ── Connect Phantom (SOL) ──────────────────────────────────────────────────
  const connectSolana = useCallback(async () => {
    setStatus("connecting"); setErrMsg("");
    try {
      const prov = getSolProv();
      if (!prov) {
        if (phantomRef.current) {
          phantomRef.current.show();
          setErrMsg("Use the Phantom wallet that appeared on screen, or install the browser extension.");
        } else {
          window.open("https://phantom.app/download", "_blank");
          setErrMsg("Phantom not found — install it and reload the page.");
        }
        setStatus("idle");
        return;
      }
      const resp = await (prov as { connect: (o?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }> }).connect();
      setSolAddr(resp.publicKey.toString());
      setStatus("idle");
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "Connection cancelled");
      setStatus("idle");
    }
  }, [getSolProv]);

  // ── Send SOL → auto-verify ─────────────────────────────────────────────────
  const sendSolana = useCallback(async () => {
    if (!solAddr) return;
    if (approxSol === 0) { setErrMsg("Free plan — no payment required."); return; }
    setStatus("sending"); setErrMsg("");
    try {
      const prov = getSolProv() as { signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }> } | null;
      if (!prov) throw new Error("Phantom disconnected");
      const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
      const fromPubkey = new PublicKey(solAddr);
      const toPubkey   = new PublicKey(SOL_WALLET);
      const lamports   = Math.round(approxSol * LAMPORTS_PER_SOL);
      const tx = new Transaction().add(
        SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
      );
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = fromPubkey;
      const { signature } = await prov.signAndSendTransaction(tx);
      setTxSig(signature);
      // Auto-verify on-chain immediately — pass solAddr explicitly to avoid stale closure
      await verifySolTx(signature, solAddr);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "Transaction failed");
      setStatus("idle");
    }
  }, [solAddr, approxSol, getSolProv, verifySolTx]);

  // ── Connect + Send ETH ─────────────────────────────────────────────────────
  const connectAndSendEth = useCallback(async () => {
    const prov = getEthProv();
    if (!prov) {
      if (phantomRef.current) { phantomRef.current.show(); setErrMsg("Use the Phantom embedded wallet."); }
      else { window.open("https://phantom.app/download", "_blank"); setErrMsg("No Ethereum wallet — install Phantom or MetaMask."); }
      return;
    }
    setStatus("connecting"); setErrMsg("");
    try {
      const accounts = await prov.request({ method: "eth_requestAccounts" }) as string[];
      const addr = accounts[0] ?? "";
      setEthAddr(addr);
      setStatus("idle");
      if (price.usd === 0) { setErrMsg("Free plan — no payment required."); return; }
      setStatus("sending");
      const weiHex = "0x" + Math.round(approxEth * 1e18).toString(16);
      const txHash = await prov.request({
        method: "eth_sendTransaction",
        params: [{ from: addr, to: ETH_WALLET, value: weiHex }],
      }) as string;
      setTxSig(txHash);
      setStatus("success");
      setActivation("email-fallback"); // ETH verification not automated yet
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "Transaction rejected");
      setStatus("idle");
    }
  }, [getEthProv, price.usd, approxEth]);

  // ── Copy ───────────────────────────────────────────────────────────────────
  const copyAddr = useCallback(async (s: string) => {
    await navigator.clipboard.writeText(s);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, []);

  if (!open) return null;

  const isSol    = chain === "sol";
  const wallet   = isSol ? SOL_WALLET : ETH_WALLET;
  const qrData   = isSol ? solanaPayURI(approxSol, plan) : `ethereum:${ETH_WALLET}`;
  const connAddr = isSol ? solAddr : ethAddr;
  const hasConn  = connAddr.length > 0;

  return (
    <div className="dlm-overlay" onClick={onClose}>
      <div className="cpay-card" onClick={e => e.stopPropagation()}>
        <button className="dlm-close" onClick={onClose} aria-label="Close">✕</button>

        {/* ── Header ── */}
        <div className="cpay-head">
          <div className="cpay-icon">◈</div>
          <div>
            <h2 className="cpay-title">Pay with Crypto</h2>
            <div className="cpay-sub">
              Plan <strong style={{ color: "var(--prime)" }}>{plan}</strong>
              {price.usd > 0 && <> · <strong>${price.usd}/mo</strong></>}
              {price.usd === 0 && <span style={{ color: "var(--green)" }}> · Free</span>}
            </div>
          </div>
        </div>

        {/* ── Chain toggle ── */}
        <div className="cpay-tabs">
          <button
            className={`cpay-tab${isSol ? " active" : ""}`}
            onClick={() => { setChain("sol"); setStatus("idle"); setErrMsg(""); }}
          >
            <svg viewBox="0 0 128 128" width="15" height="15" fill="currentColor">
              <path d="M26.1 88.8c.6-.6 1.4-.9 2.3-.9h89.7c1.5 0 2.2 1.8 1.2 2.8L100.3 110c-.6.6-1.4.9-2.3.9H8.3c-1.5 0-2.2-1.8-1.2-2.8l19-19.3zm0-59.8c.6-.6 1.4-.9 2.3-.9h89.7c1.5 0 2.2 1.8 1.2 2.8L100.3 50c-.6.6-1.4.9-2.3.9H8.3c-1.5 0-2.2-1.8-1.2-2.8l19-19.1zM100.3 59c.6-.6 1.4-.9 2.3-.9h18c1.5 0 2.2 1.8 1.2 2.8L102.6 80c-.6.6-1.4.9-2.3.9H8.3c-1.5 0-2.2-1.8-1.2-2.8L26.1 59H100.3z"/>
            </svg>
            Solana (SOL)
          </button>
          <button
            className={`cpay-tab${!isSol ? " active" : ""}`}
            onClick={() => { setChain("eth"); setStatus("idle"); setErrMsg(""); }}
          >
            <svg viewBox="0 0 32 32" width="14" height="14" fill="currentColor">
              <path d="M16 3.5L7 16.4l9 5.3 9-5.3L16 3.5zm0 3.7l6.2 8.7-6.2 3.6-6.2-3.6 6.2-8.7zm0 14.5L7 18.2l9 10.3 9-10.3-9 3.5z"/>
            </svg>
            Ethereum (ETH)
          </button>
        </div>

        {/* ── Verifying spinner ── */}
        {status === "verifying" && (
          <div className="cpay-verifying">
            <div className="cpay-spinner" />
            <div className="cpay-verify-title">Verifying on-chain…</div>
            <div className="cpay-verify-sub">Querying Solana RPC · this takes a few seconds</div>
          </div>
        )}

        {/* ── Success ── */}
        {status === "success" && (
          <div className="cpay-success">
            <div className={`cpay-success-icon${activation === "verified" ? " cpay-success-icon--green" : ""}`}>
              {activation === "verified" ? "✓" : "◈"}
            </div>
            <div className="cpay-success-title">
              {activation === "verified" ? "Plan Activated!" : "Payment Sent!"}
            </div>
            <div className="cpay-success-sub">
              {activation === "verified"
                ? "Verified on-chain — no email required"
                : "Transaction confirmed · manual review required"}
            </div>
            <div className="cpay-txhash">
              <span className="cpay-txlbl">TX HASH</span>
              <span className="cpay-txval">{shortAddr(txSig)}</span>
              <button className="cpay-copy" onClick={() => copyAddr(txSig)}>{copied ? "✓" : "copy"}</button>
            </div>
            {activation === "verified" ? (
              <p className="cpay-success-note cpay-success-note--verified">
                Your <strong>{plan}</strong> plan is now active. Thank you!
              </p>
            ) : (
              <>
                {errMsg && <div className="cpay-err cpay-err--sm">{errMsg}</div>}
                <p className="cpay-success-note">
                  Email{" "}<a href="mailto:klonengine@proton.me" className="priv-link">klonengine@proton.me</a>{" "}
                  with this TX hash to activate your plan. We'll respond within 24 h.
                </p>
              </>
            )}
          </div>
        )}

        {/* ── Main body (idle / connecting / sending) ── */}
        {status !== "verifying" && status !== "success" && (
          <div className="cpay-body">
            {/* ── QR code ── */}
            <div className="cpay-qr-wrap">
              <QRCodeSVG
                value={qrData}
                size={148}
                bgColor="transparent"
                fgColor={isSol ? "#c084fc" : "#00d4ff"}
                level="M"
              />
              <div className="cpay-qrlbl">
                {isSol ? "Phantom / Solana Pay" : "MetaMask / Phantom"}
              </div>
            </div>

            {/* ── Right panel ── */}
            <div className="cpay-right">
              {/* Address */}
              <div className="cpay-addr-block">
                <div className="cpay-addr-lbl">{isSol ? "SOLANA WALLET" : "ETHEREUM WALLET"}</div>
                <div className="cpay-addr-row">
                  <code className="cpay-addr">{shortAddr(wallet)}</code>
                  <button className="cpay-copy" onClick={() => copyAddr(wallet)}>
                    {copied ? "✓ copied" : "copy"}
                  </button>
                </div>
                <div className="cpay-addr-full">{wallet}</div>
              </div>

              {/* Amount */}
              {price.usd > 0 && (
                <div className="cpay-amount-block">
                  <div className="cpay-amount-row">
                    <span className="cpay-amount-lbl">USD</span>
                    <span className="cpay-amount-val">${price.usd}</span>
                  </div>
                  {isSol ? (
                    <div className="cpay-amount-row">
                      <span className="cpay-amount-lbl">≈ SOL</span>
                      <span className="cpay-amount-val" style={{ color: "#c084fc" }}>
                        {approxSol} SOL
                      </span>
                    </div>
                  ) : (
                    <div className="cpay-amount-row">
                      <span className="cpay-amount-lbl">≈ ETH</span>
                      <span className="cpay-amount-val" style={{ color: "#00d4ff" }}>
                        {approxEth} ETH
                      </span>
                    </div>
                  )}
                  <div className="cpay-rate-note">
                    Amounts are approximate — the server verifies the actual value on-chain
                  </div>
                </div>
              )}

              {/* Connected address */}
              {hasConn && (
                <div className="cpay-connected">
                  <span className="cpay-conn-dot" />
                  <span className="cpay-conn-addr">{shortAddr(connAddr)}</span>
                  <span className="cpay-conn-lbl">connected</span>
                </div>
              )}

              {/* Error */}
              {errMsg && <div className="cpay-err">{errMsg}</div>}

              {/* CTA */}
              <div className="cpay-actions">
                {isSol ? (
                  !hasConn ? (
                    <button
                      className="cpay-btn cpay-btn-sol"
                      onClick={connectSolana}
                      disabled={status === "connecting"}
                    >
                      {status === "connecting" ? "Connecting…" : "Connect Phantom →"}
                    </button>
                  ) : (
                    <button
                      className="cpay-btn cpay-btn-sol"
                      onClick={sendSolana}
                      disabled={status === "sending"}
                    >
                      {status === "sending"
                        ? "Sending…"
                        : approxSol > 0
                          ? `Send ${approxSol} SOL →`
                          : "Send SOL →"}
                    </button>
                  )
                ) : (
                  <button
                    className="cpay-btn cpay-btn-eth"
                    onClick={connectAndSendEth}
                    disabled={status === "connecting" || status === "sending"}
                  >
                    {status === "connecting" ? "Connecting…" :
                     status === "sending"    ? "Sending…" :
                     hasConn                 ? `Send ${approxEth} ETH →` :
                                              "Connect Wallet →"}
                  </button>
                )}
              </div>

              <div className="cpay-manual-note">
                No wallet? Copy the address and send manually from any exchange.
                Email{" "}<a href="mailto:klonengine@proton.me" className="priv-link">klonengine@proton.me</a>{" "}
                with your TX hash.
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="cpay-footer">
          <span>Powered by</span>
          <strong style={{ color: "#c084fc" }}>Phantom SDK</strong>
          <span>·</span>
          <strong style={{ color: "#00d4ff" }}>Solana Web3.js</strong>
          <span>· No middlemen · Instant settlement</span>
        </div>
      </div>
    </div>
  );
}
