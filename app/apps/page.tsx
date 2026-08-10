import type { Metadata } from "next";
import { ForgeHomePortal } from "./components/ForgeHomePortal";

export const metadata: Metadata = {
  title: "ARGUS FORGE — Home",
  description: "Your systems. One workspace.",
};

/**
 * ARGUS FORGE portal home.
 * - Left A mark = Home (this page)
 * - ··· = quick navigate menu (no “Open Forge Home” footer; no right-side app icons)
 */
export default function AppsHubPage() {
  return <ForgeHomePortal />;
}
