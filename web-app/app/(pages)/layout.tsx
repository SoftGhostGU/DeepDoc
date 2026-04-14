import type { ReactNode } from "react";

import { AppSidebar } from "@/components/rag/app-sidebar";

export default function AppPagesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-100 text-slate-900">
      <AppSidebar />
      <main className="min-w-0 flex-1 overflow-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
