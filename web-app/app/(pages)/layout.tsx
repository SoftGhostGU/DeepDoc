import type { ReactNode } from "react";

import { AppSidebar } from "@/components/rag/app-sidebar";

export default function AppPagesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden text-[var(--foreground)] md:h-screen md:flex-row">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_4%,rgba(99,102,241,0.1),transparent_38%)]" />
      <AppSidebar />
      <main className="relative min-w-0 flex-1 overflow-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_24%)] p-3 md:p-6">
        <div className="animate-fade-in-up [animation-delay:120ms]">{children}</div>
      </main>
    </div>
  );
}
