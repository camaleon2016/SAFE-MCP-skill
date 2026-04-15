import type { IncomingMessage } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import { logAccessDenied, logAccessGranted } from "./logger.js";

// ── Configuration (env-driven) ──────────────────────────────────────

function loadList(envVar: string): Set<string> {
  const raw = process.env[envVar];
  if (!raw) return new Set();
  return new Set(
    raw.split(",").map((s) => s.trim()).filter(Boolean),
  );
}

const API_KEYS = loadList("SAFE_MCP_API_KEYS");
const IP_ALLOWLIST = loadList("SAFE_MCP_IP_ALLOWLIST");
const REQUIRE_API_KEY = process.env["SAFE_MCP_REQUIRE_API_KEY"] === "true";
const REQUIRE_IP_ALLOWLIST = process.env["SAFE_MCP_REQUIRE_IP_ALLOWLIST"] === "true";

// ── Helpers ─────────────────────────────────────────────────────────

export function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return req.socket.remoteAddress ?? "unknown";
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(createHmac("sha256", "key").update(a).digest());
  const bufB = Buffer.from(createHmac("sha256", "key").update(b).digest());
  return timingSafeEqual(bufA, bufB);
}

// ── Access Check ────────────────────────────────────────────────────

export interface AccessResult {
  allowed: boolean;
  reason?: string | undefined;
}

export function checkAccess(req: IncomingMessage): AccessResult {
  const clientIp = getClientIp(req);

  // IP allowlist check
  if (REQUIRE_IP_ALLOWLIST && IP_ALLOWLIST.size > 0) {
    if (!IP_ALLOWLIST.has(clientIp)) {
      logAccessDenied("ip_not_allowlisted", clientIp, { allowlistSize: IP_ALLOWLIST.size });
      return { allowed: false, reason: "IP address not in allowlist" };
    }
  }

  // API key check
  if (REQUIRE_API_KEY && API_KEYS.size > 0) {
    const provided = req.headers["x-api-key"] ?? req.headers["authorization"]?.replace(/^Bearer\s+/i, "");
    if (typeof provided !== "string" || !provided) {
      logAccessDenied("missing_api_key", clientIp);
      return { allowed: false, reason: "API key required" };
    }

    let valid = false;
    for (const key of API_KEYS) {
      if (safeCompare(provided, key)) {
        valid = true;
        break;
      }
    }

    if (!valid) {
      logAccessDenied("invalid_api_key", clientIp);
      return { allowed: false, reason: "Invalid API key" };
    }
  }

  logAccessGranted(clientIp);
  return { allowed: true };
}
