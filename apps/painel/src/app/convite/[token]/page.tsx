"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { getInviteInfo, acceptInvite, setSession, type TeamMemberUser, ApiError } from "@/lib/api";

type InviteInfo = {
  id: string;
  email: string;
  role: string;
  status: string;
  nutritionist_name: string;
};

export default function ConvitePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    getInviteInfo(token)
      .then((data) => setInfo(data.member))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setLoadError("Este convite é inválido ou já foi usado.");
        } else {
          setLoadError("Não foi possível carregar o convite. Tente novamente.");
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setSubmitError("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setSubmitError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await acceptInvite(token, name, password);
      const user: TeamMemberUser = {
        is_team_member: true,
        name: result.name,
        role: result.role as TeamMemberUser["role"],
        nutritionist_name: result.nutritionist_name,
        email: info?.email,
      };
      setSession(result.token, user);
      router.replace("/");
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Erro ao ativar conta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)]">
        <div className="mb-6 flex flex-col gap-4">
          <Image src="/logo.png" alt="Frame System" width={48} height={44} priority />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Ativar conta</h1>
            <p className="mt-1 text-sm text-muted-foreground">Frame System</p>
          </div>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground">Verificando convite...</p>
        )}

        {loadError && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-destructive">{loadError}</p>
            <a
              href="/login"
              className="text-center text-sm text-primary underline underline-offset-2"
            >
              Ir para o login
            </a>
          </div>
        )}

        {!loading && !loadError && info && (
          <>
            <div className="mb-5 rounded-xl border border-border bg-surface-2/40 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Você foi convidado(a) por </span>
              <strong>{info.nutritionist_name}</strong>
              <span className="text-muted-foreground"> para o Frame System.</span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">E-mail</span>
                <input
                  type="email"
                  value={info.email}
                  disabled
                  className="h-11 rounded-lg border border-border bg-background/20 px-3.5 text-sm text-muted-foreground cursor-not-allowed"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">Nome completo</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="h-11 rounded-lg border border-border bg-background/40 px-3.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">Criar senha</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="h-11 rounded-lg border border-border bg-background/40 px-3.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">Confirmar senha</span>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 rounded-lg border border-border bg-background/40 px-3.5 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              {submitError && <p className="text-sm text-destructive">{submitError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 h-11 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-70"
              >
                {submitting ? "Ativando conta..." : "Ativar conta e entrar"}
              </button>

              <p className="text-center text-xs text-muted-foreground">
                Já tem conta?{" "}
                <a href="/login" className="text-primary">
                  Entrar
                </a>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
