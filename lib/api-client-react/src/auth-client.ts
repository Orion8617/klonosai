// better-auth browser client — ZeroLag
// Import from "@workspace/api-client-react/auth" in app code.

import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";

// In dev the API server runs on the same Replit domain at /api/auth.
// In production it will be https://zerolag.klonos.app/api/auth.
const API_BASE =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host}`
    : "http://localhost:3001";

type AuthClientType = ReturnType<typeof createAuthClient>;

export const authClient: any = createAuthClient({
  baseURL: `${API_BASE}/api/auth`,
  plugins: [passkeyClient()],
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
} = authClient;
