"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { login, getToken, ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/");
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)]">
        <div className="mb-6 flex flex-col gap-4">
          <Image src="/logo.png" alt="Frame System" width={48} height={44} priority />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Entrar no Frame System</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acesse o painel do seu atendimento
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted-foreground">E-mail</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-lg border border-border bg-background/40 px-3.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              placeholder="voce@clinica.com.br"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted-foreground">Senha</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-lg border border-border bg-background/40 px-3.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              placeholder="••••••••"
            />
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-11 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-70"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p className="mt-1 text-center text-xs text-muted-foreground">
            Problemas para entrar?{" "}
            <span className="text-primary">Entre em contato com o suporte</span>
          </p>
        </form>
      </div>
    </div>
  );
}
