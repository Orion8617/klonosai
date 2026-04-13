import express, { type Express } from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { auth } from "./lib/auth";

const app: Express = express();

// Trust the first hop (Replit proxy, nginx, etc.) so that secure cookies
// work correctly when TLS is terminated upstream.
app.set("trust proxy", 1);

// ── better-auth: must be mounted BEFORE express.json() ────────────────────────
// Handles all of /api/auth/* — registration, login, passkey, sessions, OAuth
app.use("/api/auth", toNodeHandler(auth));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// ── CORS — allowlist instead of wildcard-reflect ──────────────────────────────
const PROD_ORIGINS = ["https://zerolag.klonos.app"];
const DEV_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /\.replit\.dev$/,
  /\.replit\.app$/,
  /\.janeway\.replit\.dev$/,
];
const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return false;
  if (process.env["NODE_ENV"] === "production") {
    return PROD_ORIGINS.includes(origin);
  }
  return DEV_ORIGIN_PATTERNS.some(r => r.test(origin));
};
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || isAllowedOrigin(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
