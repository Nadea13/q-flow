import { Axiom } from "@axiomhq/js";

const token = process.env.AXIOM_TOKEN;
const dataset = process.env.AXIOM_DATASET || "qflow";

// Initialize Axiom client only if token is configured
const axiom = token ? new Axiom({ token }) : null;

type LogLevel = "info" | "warn" | "error" | "debug";
type LogContext = Record<string, unknown> | Error | unknown;

function normalizeContext(context?: LogContext): Record<string, unknown> {
  if (!context) return {};
  if (context instanceof Error) {
    return {
      errorMessage: context.message,
      stack: context.stack,
      errorName: context.name,
    };
  }
  if (typeof context === "object" && context !== null) {
    return context as Record<string, unknown>;
  }
  return { value: context };
}

async function sendToAxiom(level: LogLevel, message: string, context?: LogContext) {
  if (!axiom) return;
  try {
    const event = {
      _time: new Date().toISOString(),
      level,
      message,
      environment: process.env.NODE_ENV || "development",
      ...normalizeContext(context),
    };
    await axiom.ingest(dataset, [event]);
  } catch (axiomErr) {
    // Avoid crashing application if Axiom service is temporarily unreachable
    console.error("[Axiom Logger Failed to Ingest]", axiomErr);
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => {
    console.log(`[INFO] ${message}`, context ?? "");
    return sendToAxiom("info", message, context);
  },

  warn: (message: string, context?: LogContext) => {
    console.warn(`[WARN] ${message}`, context ?? "");
    return sendToAxiom("warn", message, context);
  },

  error: (message: string, error?: LogContext) => {
    console.error(`[ERROR] ${message}`, error ?? "");
    return sendToAxiom("error", message, error);
  },

  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[DEBUG] ${message}`, context ?? "");
      return sendToAxiom("debug", message, context);
    }
    return Promise.resolve();
  },

  flush: async () => {
    if (axiom) {
      await axiom.flush();
    }
  },
};

export default logger;
