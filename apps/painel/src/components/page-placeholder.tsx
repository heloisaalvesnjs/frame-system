import type { ReactNode } from "react";
import { WrenchIcon } from "lucide-react";

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
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          {icon ?? <WrenchIcon className="size-5" />}
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card p-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <WrenchIcon className="size-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Em construção</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Esta tela vai ler e escrever direto na Frame API — o que você salvar aqui já vale
            no atendimento da IA.
          </p>
        </div>
        {points && points.length > 0 && (
          <ul className="grid w-full max-w-md gap-2 text-left text-sm">
            {points.map((p) => (
              <li
                key={p}
                className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2"
              >
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-muted-foreground">{p}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
