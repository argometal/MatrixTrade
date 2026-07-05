"use client";

import { AddMenuButton } from "@/app/argus/components/ArgusAddLauncher";

export function V2TopBarAdd() {
  return (
    <div className="hidden lg:block">
      <AddMenuButton variant="nav" align="end" />
    </div>
  );
}
