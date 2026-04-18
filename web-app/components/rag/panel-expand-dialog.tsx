"use client";

import type { ReactNode } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PanelExpandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}

export function PanelExpandDialog({
  open,
  onOpenChange,
  title,
  children,
}: PanelExpandDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-h-[85vh] w-[calc(100vw-2rem)] max-w-5xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-[var(--border-subtle)] px-5 py-4 pr-12">
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 md:px-5">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
