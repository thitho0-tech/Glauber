import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Loading({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-12 text-muted-foreground", className)}>
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}
