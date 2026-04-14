import { FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          No documents yet
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600">
          Upload your first PDF, Markdown, or TXT file to start asking questions.
        </p>
      </CardContent>
    </Card>
  );
}
