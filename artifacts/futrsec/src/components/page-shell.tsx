import { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function PageHeader({
  title, subtitle, actions, icon: Icon,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-[18px] w-[18px] text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-heading font-bold text-foreground tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-white border border-border/60 rounded-xl p-5 shadow-sm space-y-3">
      <Skeleton className="h-5 w-2/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-4" style={{ width: `${90 - i * 10}%` }} />
      ))}
    </div>
  );
}

export function GridSkeleton({ cols = 3, rows = 2 }: { cols?: number; rows?: number }) {
  const colClass = cols === 1 ? "" : cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`grid gap-4 grid-cols-1 ${colClass}`}>
      {Array.from({ length: Math.min(cols * rows, 9) }).map((_, i) => (
        <CardSkeleton key={i} rows={2} />
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon, title, description, action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground/40" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-4">{description}</p>
      {action}
    </div>
  );
}
