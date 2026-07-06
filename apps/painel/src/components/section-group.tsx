import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionGroupProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "muted";
}

export function SectionGroup({
  icon: Icon,
  title,
  description,
  children,
  className,
  variant = "default",
}: SectionGroupProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className="size-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <Icon className="size-4 text-accent-foreground" />
          </div>
        )}
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div
        className={cn(
          "rounded-2xl border border-border",
          variant === "muted" ? "bg-muted/40" : "bg-card"
        )}
      >
        {children}
      </div>
    </section>
  );
}

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h1 className="text-xl font-bold text-foreground tracking-tight">{title}</h1>
      {description && (
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
  );
}
