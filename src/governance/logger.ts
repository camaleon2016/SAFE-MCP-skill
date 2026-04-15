import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// ── Configuration ───────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error" | "audit";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  audit: 4,
};

const minLevel: LogLevel = (process.env["LOG_LEVEL"] as LogLevel | undefined) ?? "info";
const logDir = process.env["LOG_DIR"] ?? "logs";
const logToFile = process.env["LOG_TO_FILE"] !== "false";
const logToStderr = process.env["LOG_TO_STDERR"] !== "false";

if (logToFile) {
  mkdirSync(logDir, { recursive: true });
}

// ── Structured Log Entry ────────────────────────────────────────────

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  sessionId?: string | undefined;
  clientIp?: string | undefined;
  toolName?: string | undefined;
  duration?: number | undefined;
  detail?: unknown;
}

// ── Core Logger ─────────────────────────────────────────────────────

function emit(entry: LogEntry): void {
  if (LOG_LEVELS[entry.level] < LOG_LEVELS[minLevel]) return;

  const line = JSON.stringify(entry);

  if (logToStderr) {
    process.stderr.write(line + "\n");
  }

  if (logToFile) {
    const date = entry.timestamp.slice(0, 10); // YYYY-MM-DD
    const file = entry.level === "audit"
      ? resolve(logDir, `audit-${date}.jsonl`)
      : resolve(logDir, `app-${date}.jsonl`);
    appendFileSync(file, line + "\n", "utf-8");
  }
}

export function log(level: LogLevel, event: string, extra?: Partial<Omit<LogEntry, "timestamp" | "level" | "event">>): void {
  emit({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...extra,
  });
}

// ── Convenience Methods ─────────────────────────────────────────────

export function debug(event: string, extra?: Partial<Omit<LogEntry, "timestamp" | "level" | "event">>): void {
  log("debug", event, extra);
}

export function info(event: string, extra?: Partial<Omit<LogEntry, "timestamp" | "level" | "event">>): void {
  log("info", event, extra);
}

export function warn(event: string, extra?: Partial<Omit<LogEntry, "timestamp" | "level" | "event">>): void {
  log("warn", event, extra);
}

export function error(event: string, extra?: Partial<Omit<LogEntry, "timestamp" | "level" | "event">>): void {
  log("error", event, extra);
}

export function audit(event: string, extra?: Partial<Omit<LogEntry, "timestamp" | "level" | "event">>): void {
  log("audit", event, extra);
}

// ── Tool Call Logger ────────────────────────────────────────────────

export function logToolCall(
  toolName: string,
  sessionId: string | undefined,
  clientIp: string | undefined,
  durationMs: number,
  success: boolean,
  detail?: unknown,
): void {
  audit(success ? "tool_call_success" : "tool_call_failure", {
    toolName,
    sessionId,
    clientIp,
    duration: durationMs,
    detail,
  });
}

// ── Access Control Logger ───────────────────────────────────────────

export function logAccessDenied(reason: string, clientIp: string | undefined, detail?: unknown): void {
  audit("access_denied", { clientIp, detail: { reason, ...(detail != null ? { extra: detail } : {}) } });
}

export function logAccessGranted(clientIp: string | undefined, detail?: unknown): void {
  debug("access_granted", { clientIp, detail });
}
