import { redirect } from "next/navigation";

/** Training Lab lives under Argus Forge — not Argus Work Tracker. */
export default function LegacyArgusLabRedirect() {
  redirect("/forge/lab");
}
