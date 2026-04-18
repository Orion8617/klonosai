// ─── WebAuthn / Passkey routes ────────────────────────────────────────────────
//
//  POST /api/auth/webauthn/register-options   → generate registration options
//  POST /api/auth/webauthn/register-verify    → verify and store credential
//  POST /api/auth/webauthn/login-options      → generate auth options
//  POST /api/auth/webauthn/login-verify       → verify login & return session
//
//  In-memory store — sufficient for MVP. Replace Maps with DB for production.

import { Router } from "express";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifyRegistrationResponseOpts,
  type VerifyAuthenticationResponseOpts,
} from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import type { Request, Response } from "express";

// ── Config ─────────────────────────────────────────────────────────────────────
const RP_NAME     = "ZeroLag by KlonOS";
const RP_ID       = process.env["NODE_ENV"] === "production"
  ? "zerolag.klonos.app"
  : "localhost";
const RP_ORIGIN   = process.env["NODE_ENV"] === "production"
  ? "https://zerolag.klonos.app"
  : undefined; // undefined → accepts any origin in dev

// ── In-memory stores ──────────────────────────────────────────────────────────
type StoredCredential = {
  id:           string;
  publicKey:    any;
  counter:      number;
  transports:   AuthenticatorTransportFuture[];
  username:     string;
  createdAt:    number;
};

const usersByName = new Map<string, { id: string; username: string }>();
const credsByUser = new Map<string, StoredCredential[]>();
const allCreds    = new Map<string, StoredCredential>();

// challenges are stored in express-session (req.session.webauthn_challenge)
declare module "express-session" {
  interface SessionData {
    webauthn_challenge?: string;
    webauthn_username?:  string;
    logged_in?:          boolean;
    username?:           string;
  }
}

function userIdFromName(name: string): any {
  const enc = new TextEncoder();
  return enc.encode(name.slice(0, 64));
}

const router = Router();

// ─── 1. Register: generate options ───────────────────────────────────────────
router.post("/register-options", async (req: Request, res: Response) => {
  const { username } = req.body as { username?: string };
  if (!username || username.trim().length < 2) {
    res.status(400).json({ error: "Username must be at least 2 characters" });
    return;
  }

  const name = username.trim().toLowerCase();

  // ── Ownership gate ────────────────────────────────────────────────────────
  // If this username already has credentials, only allow adding more if the
  // caller is already authenticated as that user. This prevents an attacker
  // from binding their passkey to a victim's existing account.
  if (usersByName.has(name)) {
    const existingCredCount = (credsByUser.get(name) ?? []).length;
    if (existingCredCount > 0) {
      const sessionOk =
        req.session?.logged_in === true && req.session?.username === name;
      if (!sessionOk) {
        res.status(409).json({
          error:
            "Username already registered. Sign in with your existing passkey to add another device.",
        });
        return;
      }
    }
  }

  if (!usersByName.has(name)) {
    usersByName.set(name, { id: Buffer.from(userIdFromName(name)).toString("base64url"), username: name });
  }
  const user = usersByName.get(name)!;

  const existingCreds = (credsByUser.get(name) ?? []).map(c => ({
    id: c.id,
    transports: c.transports,
  }));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.username,
    userID: new Uint8Array(Buffer.from(user.id, "base64url")) as any,
    attestationType: "none",
    excludeCredentials: existingCreds,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  req.session!.webauthn_challenge = options.challenge;
  req.session!.webauthn_username  = name;

  res.json(options);
});

// ─── 2. Register: verify response ────────────────────────────────────────────
router.post("/register-verify", async (req: Request, res: Response) => {
  const challenge = req.session?.webauthn_challenge;
  const username  = req.session?.webauthn_username;

  if (!challenge || !username) {
    res.status(400).json({ error: "Session expired — try again" });
    return;
  }

  try {
    const opts: VerifyRegistrationResponseOpts = {
      response:         req.body,
      expectedChallenge: challenge,
      expectedRPID:     RP_ID,
      expectedOrigin:   RP_ORIGIN ?? req.headers["origin"] as string,
    };
    const { verified, registrationInfo } = await verifyRegistrationResponse(opts);

    if (!verified || !registrationInfo) {
      res.status(400).json({ error: "Registration failed" });
      return;
    }

    const { credential } = registrationInfo;

    const stored: StoredCredential = {
      id:         credential.id,
      publicKey:  new Uint8Array(credential.publicKey),
      counter:    credential.counter,
      transports: (req.body.response?.transports as AuthenticatorTransportFuture[]) ?? [],
      username,
      createdAt:  Date.now(),
    };

    const list = credsByUser.get(username) ?? [];
    list.push(stored);
    credsByUser.set(username, list);
    allCreds.set(credential.id, stored);

    delete req.session!.webauthn_challenge;

    req.session!.logged_in = true;
    req.session!.username  = username;

    res.json({ verified: true, username });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ error: msg });
  }
});

// ─── 3. Login: generate options ───────────────────────────────────────────────
router.post("/login-options", async (req: Request, res: Response) => {
  const { username } = req.body as { username?: string };

  let allowCredentials: { id: string; transports: AuthenticatorTransportFuture[] }[] = [];

  if (username) {
    const name = username.trim().toLowerCase();
    const creds = credsByUser.get(name) ?? [];
    allowCredentials = creds.map(c => ({ id: c.id, transports: c.transports }));
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials,
    userVerification: "preferred",
  });

  req.session!.webauthn_challenge = options.challenge;
  if (username) req.session!.webauthn_username = username.trim().toLowerCase();

  res.json(options);
});

// ─── 4. Login: verify response ────────────────────────────────────────────────
router.post("/login-verify", async (req: Request, res: Response) => {
  const challenge = req.session?.webauthn_challenge;
  if (!challenge) {
    res.status(400).json({ error: "Session expired — try again" });
    return;
  }

  const credId  = req.body?.id as string;
  const stored  = allCreds.get(credId);

  if (!stored) {
    res.status(400).json({ error: "Credential not found — please register first" });
    return;
  }

  try {
    const opts: VerifyAuthenticationResponseOpts = {
      response:          req.body,
      expectedChallenge: challenge,
      expectedRPID:      RP_ID,
      expectedOrigin:    RP_ORIGIN ?? req.headers["origin"] as string,
      credential: {
        id:        stored.id,
        publicKey: stored.publicKey as any,
        counter:   stored.counter,
        transports: stored.transports,
      },
    };

    const { verified, authenticationInfo } = await verifyAuthenticationResponse(opts);

    if (!verified) {
      res.status(401).json({ error: "Authentication failed" });
      return;
    }

    // Update counter
    stored.counter = authenticationInfo.newCounter;
    allCreds.set(credId, stored);

    delete req.session!.webauthn_challenge;
    req.session!.logged_in = true;
    req.session!.username  = stored.username;

    res.json({ verified: true, username: stored.username });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ error: msg });
  }
});

// ─── 5. Logout ────────────────────────────────────────────────────────────────
router.post("/logout", (req: Request, res: Response) => {
  req.session?.destroy(() => {});
  res.json({ ok: true });
});

// ─── 6. Session status ────────────────────────────────────────────────────────
router.get("/me", (req: Request, res: Response) => {
  if (req.session?.logged_in) {
    res.json({ loggedIn: true, username: req.session.username });
  } else {
    res.json({ loggedIn: false });
  }
});

export default router;
