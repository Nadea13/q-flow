import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAxiomConfigured = Boolean(process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET);

  await logger.info("Axiom test log triggered from /api/test-log", {
    test: true,
    triggeredAt: new Date().toISOString(),
    isConfigured: isAxiomConfigured,
  });

  await logger.flush();

  return NextResponse.json({
    status: "ok",
    message: isAxiomConfigured
      ? "Log dispatched to Axiom successfully! Check your Axiom dashboard."
      : "Axiom token is not yet configured in .env.local. Log was printed to console.",
    dataset: process.env.AXIOM_DATASET || "not_set",
    configured: isAxiomConfigured,
  });
}
