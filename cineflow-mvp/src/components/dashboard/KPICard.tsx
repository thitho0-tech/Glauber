import { cn } from "@/lib/utils";
import type { KPIStatus } from "@/types/dashboard";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

type Props = {
  label: string;
  value: number;
  unit?: string;
  status: KPIStatus;
  trend?: "up" | "down" | "stable";
  description?: string;
};

const statusClasses: Record<KPIStatus, string> = {
  ok:      "text-green-600",
  warning: "text-yellow-600",
  danger:  "text-red-600",
};

const badgeClasses: Record<KPIStatus, string> = {
  ok:      "bg-green-50 border-green-200",
  warning: "bg-yellow-50 border-yellow-200",
  danger:  "bg-red-50 border-red-200",
};

const TrendIcon = ({ trend }: { trend: Props["trend"] }) => {
  if (!trend) return null;
  if (trend === "up")     return <TrendingUp  className="h-4 w-4 text-green-500" />;
  if (trend === "down")   return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

export function KPICard({ label, value, unit = "%", status, trend, description }: Props) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-all",
        badgeClasses[status]
      )}
    >
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      <div className="flex items-end justify-between">
        <span className={cn("text-3xl font-bold tabular-nums", statusClasses[status])}>
          {value.toFixed(1)}{unit}
        </span>
        <TrendIcon trend={trend} />
      </div>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
