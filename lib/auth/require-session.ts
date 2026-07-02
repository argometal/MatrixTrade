import { redirect } from "next/navigation";
import { hasArgusSession, hasTradingSession } from "./cookies";
import { argusAuthRequired, tradingAuthRequired } from "./passwords";

export async function requireTradingSession(): Promise<void> {
  if (!tradingAuthRequired()) return;
  if (!(await hasTradingSession())) {
    redirect("/login");
  }
}

export async function requireArgusSession(): Promise<void> {
  if (!argusAuthRequired()) return;
  if (!(await hasArgusSession())) {
    redirect("/argus/login");
  }
}
