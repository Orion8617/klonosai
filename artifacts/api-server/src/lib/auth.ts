// better-auth v1 — ZeroLag unified auth
// Passkey (WebAuthn) + Email/Password. Google/GitHub OAuth ready via env vars.

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { passkey } from "@better-auth/passkey";
import { db } from "@workspace/db";
import * as schema from "@workspace/db/schema";

const BASE_URL =
  process.env["BETTER_AUTH_URL"] ??
  (process.env["NODE_ENV"] === "production"
    ? "https://zerolag.klonos.app"
    : `https://${process.env["REPLIT_DEV_DOMAIN"] ?? "localhost:3001"}`);

export const auth = betterAuth({
  baseURL: BASE_URL,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user:         schema.user,
      session:      schema.session,
      account:      schema.account,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  plugins: [
    passkey({
      rpName: "ZeroLag by KlonOS",
      rpID:
        process.env["NODE_ENV"] === "production"
          ? "zerolag.klonos.app"
          : undefined,
      origin:
        process.env["NODE_ENV"] === "production"
          ? "https://zerolag.klonos.app"
          : undefined,
    }),
  ],

  socialProviders: {
    ...(process.env["GOOGLE_CLIENT_ID"] && process.env["GOOGLE_CLIENT_SECRET"]
      ? {
          google: {
            clientId:     process.env["GOOGLE_CLIENT_ID"],
            clientSecret: process.env["GOOGLE_CLIENT_SECRET"],
          },
        }
      : {}),
    ...(process.env["GITHUB_CLIENT_ID"] && process.env["GITHUB_CLIENT_SECRET"]
      ? {
          github: {
            clientId:     process.env["GITHUB_CLIENT_ID"],
            clientSecret: process.env["GITHUB_CLIENT_SECRET"],
          },
        }
      : {}),
    ...(process.env["MICROSOFT_CLIENT_ID"] && process.env["MICROSOFT_CLIENT_SECRET"] && process.env["MICROSOFT_TENANT_ID"]
      ? {
          microsoft: {
            clientId:     process.env["MICROSOFT_CLIENT_ID"],
            clientSecret: process.env["MICROSOFT_CLIENT_SECRET"],
            tenantId:     process.env["MICROSOFT_TENANT_ID"],
          },
        }
      : {}),
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge:  60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge:  5 * 60,
    },
  },

  trustedOrigins: [
    "https://zerolag.klonos.app",
    "http://localhost:8081",
    "http://localhost:3000",
    "http://localhost:3001",
  ],
});

export type Auth = typeof auth;
