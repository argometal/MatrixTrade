import type { Metadata } from "next";
import { ForgeHomePortal } from "./components/ForgeHomePortal";

export const metadata: Metadata = {
  title: "ARGUS FORGE — Home",
  description: "Your systems. One workspace.",
};

/**
 * ARGUS FORGE portal home.
 * - Left A mark + wordmark = Home (this page)
 * - Right A mark = systems menu (Forge Home + apps; replaces ···)
 */
export default function AppsHubPage() {
  return <ForgeHomePortal />;
}
