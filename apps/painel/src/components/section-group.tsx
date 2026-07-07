import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface SectionGroupProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  right?: ReactNode;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function SectionGroup({
  icon: Icon,
  title,
  description,
  subtitle,
  right,
  children,
  className,
}: SectionGroupProps) {
  const sub = description ?? subtitle;
  return (
    <section className={className}>
      <div className="mb-3 flex items-end justify-between px-1">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="grid h-6 w-6 place-items-center rounded-md bg-primary/15 text-primary shrink-0">
              <Icon className="h-3.5 w-3.5" />
            </div>
          )}
          <div>
            <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
        {right}
      </div>
      <div className="card-soft p-5">{children}</div>
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
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
