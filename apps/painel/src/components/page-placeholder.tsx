import type { ReactNode } from "react";
import { Wrench } from "lucide-react";

export function PagePlaceholder({
  title,
  description,
  points,
  icon,
}: {
  title: string;
  description: string;
  points?: string[];
  icon?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
          {icon ?? <Wrench className="h-5 w-5" />}
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="card-soft flex flex-col items-center gap-5 p-10 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
          <Wrench className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Em construção</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Esta tela vai ler e escrever direto na Frame API.
          </p>
        </div>
        {points && points.length > 0 && (
          <ul className="grid w-full max-w-md gap-2 text-left text-sm text-muted-foreground">
            {points.map((p) => (
              <li
                key={p}
                className="flex items-start gap-2 rounded-lg border border-border bg-surface-2/40 px-3 py-2"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {p}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
