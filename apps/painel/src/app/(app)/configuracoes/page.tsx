"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  User,
  Bell,
  Lock,
} from "lucide-react";
import { api, ApiError, setSession, getStoredUser, type Nutritionist } from "@/lib/api";

// --- Abas disponíveis ---
type TabId = "perfil" | "seguranca" | "notificacoes";

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "perfil",       label: "Perfil",        icon: <User className="h-4 w-4" /> },
  { id: "seguranca",    label: "Segurança",      icon: <Lock className="h-4 w-4" /> },
  { id: "notificacoes", label: "Notificações",   icon: <Bell className="h-4 w-4" /> },
];

// --- Shared primitives ---
function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 px-1">
        {icon && (
          <div className="grid h-6 w-6 place-items-center rounded-md bg-primary/15 text-primary">
            {icon}
          </div>
        )}
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
      />
    </label>
  );
}

function FormFooter({
  primaryLabel = "Salvar alterações",
  onSave,
  saving,
  onCancel,
}: {
  primaryLabel?: string;
  onSave: () => void;
  saving?: boolean;
  onCancel?: () => void;
}) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      {onCancel && (
        <button
          onClick={onCancel}
          className="h-10 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
      )}
      <button
        onClick={onSave}
        disabled={saving}
        className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
      >
        {saving ? "Salvando..." : primaryLabel}
      </button>
    </div>
  );
}

// --- Aba Perfil (real, API) ---
type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  bio: string | null;
};

function PerfilTab() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    api.get<Profile>("/api/nutritionists/profile")
      .then((p) => {
        setProfile(p);
        setName(p.name ?? "");
        setPhone(p.phone ?? "");
        setSpecialty(p.specialty ?? "");
        setBio(p.bio ?? "");
      })
      .catch((e) => setMessage({ text: e instanceof ApiError ? e.message : "Erro ao carregar", ok: false }))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.put<{ id: string; name: string; email: string }>(
        "/api/nutritionists/profile",
        { name, phone, specialty, bio }
      );
      const stored = getStoredUser();
      const token = window.localStorage.getItem("frame_token");
      if (stored && token) {
        setSession(token, { ...stored, name: updated.name } as Nutritionist);
      }
      setMessage({ text: "Perfil atualizado.", ok: true });
    } catch (err) {
      setMessage({ text: err instanceof ApiError ? err.message : "Erro ao salvar", ok: false });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <Section title="Perfil" icon={<User className="h-4 w-4" />}>
      {message && (
        <div
          className={[
            "rounded-lg border px-3 py-2 text-sm",
            message.ok
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          ].join(" ")}
        >
          {message.text}
        </div>
      )}
      <div className="card-soft p-6">
        <div className="flex items-center gap-4 pb-6">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
            {name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "?"}
          </div>
          <div className="flex-1">
            <div className="text-base font-medium">{name || "—"}</div>
            <div className="text-xs text-muted-foreground">{profile?.email}</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FieldInput label="Nome completo" value={name} onChange={setName} />
          <FieldInput label="Telefone" value={phone} onChange={setPhone} placeholder="(27) 99999-9999" />
          <FieldInput label="E-mail" value={profile?.email ?? ""} onChange={() => {}} />
          <FieldInput label="Especialidade" value={specialty} onChange={setSpecialty} placeholder="Ex: Nutrição clínica" />
        </div>

        <div className="mt-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Bio</span>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-sm outline-none focus:border-primary/50 resize-none"
            />
          </label>
        </div>

        <FormFooter onSave={save} saving={saving} />
      </div>
    </Section>
  );
}

// --- Aba Segurança (real, POST /api/nutritionists/change-password) ---
function SegurancaTab() {
  const [current, setCurrent] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function save() {
    if (newPwd !== confirm) {
      setMessage({ text: "As senhas não coincidem.", ok: false });
      return;
    }
    if (newPwd.length < 8) {
      setMessage({ text: "Nova senha deve ter no mínimo 8 caracteres.", ok: false });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.post("/api/nutritionists/change-password", {
        current_password: current,
        new_password: newPwd,
      });
      setMessage({ text: "Senha atualizada com sucesso.", ok: true });
      setCurrent(""); setNewPwd(""); setConfirm("");
    } catch (err) {
      setMessage({ text: err instanceof ApiError ? err.message : "Erro ao alterar senha", ok: false });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Section title="Senha" icon={<Lock className="h-4 w-4" />}>
        {message && (
          <div
            className={[
              "rounded-lg border px-3 py-2 text-sm",
              message.ok
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-destructive/30 bg-destructive/10 text-destructive",
            ].join(" ")}
          >
            {message.text}
          </div>
        )}
        <div className="card-soft grid gap-4 p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <FieldInput label="Senha atual" value={current} onChange={setCurrent} type="password" />
          </div>
          <FieldInput label="Nova senha" value={newPwd} onChange={setNewPwd} type="password" placeholder="Mínimo 8 caracteres" />
          <FieldInput label="Confirmar nova senha" value={confirm} onChange={setConfirm} type="password" />
          <div className="md:col-span-2">
            <FormFooter primaryLabel="Atualizar senha" onSave={save} saving={saving} />
          </div>
        </div>
      </Section>
    </>
  );
}

// --- Aba Notificações (real, GET/PUT /api/nutritionists/notification-preferences) ---
type NotifPrefs = {
  notify_ai_daily_report: boolean;
  notify_new_lead: boolean;
  notify_appointment_reminder: boolean;
  notify_whatsapp_disconnected: boolean;
};

const NOTIF_ROWS: {
  key: keyof NotifPrefs;
  title: string;
  description: string;
}[] = [
  {
    key: "notify_ai_daily_report",
    title: "Resumo diário da IA",
    description: "Receba um resumo do que a assistente fez no dia",
  },
  {
    key: "notify_new_lead",
    title: "Novo lead no WhatsApp",
    description: "Seja avisado quando um lead novo iniciar conversa",
  },
  {
    key: "notify_appointment_reminder",
    title: "Lembrete de consulta",
    description: "Receba um lembrete das suas consultas do dia",
  },
  {
    key: "notify_whatsapp_disconnected",
    title: "WhatsApp desconectado",
    description: "Seja avisado se a conexão do WhatsApp cair",
  },
];

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2/40 px-4 py-3">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <button
        onClick={() => onCheckedChange(!checked)}
        className={
          "relative h-6 w-11 rounded-full transition " +
          (checked ? "bg-primary" : "bg-muted")
        }
      >
        <span
          className={
            "absolute top-0.5 h-5 w-5 rounded-full bg-background transition-all " +
            (checked ? "left-[22px]" : "left-0.5")
          }
        />
      </button>
    </div>
  );
}

function NotificacoesTab() {
  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    api.get<{ preferences: NotifPrefs }>("/api/nutritionists/notification-preferences")
      .then((r) => setPrefs(r.preferences))
      .catch((e) => setMessage({ text: e instanceof ApiError ? e.message : "Erro ao carregar", ok: false }))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(key: keyof NotifPrefs, value: boolean) {
    if (!prefs) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    try {
      const r = await api.put<{ preferences: NotifPrefs }>(
        "/api/nutritionists/notification-preferences",
        { [key]: value }
      );
      setPrefs(r.preferences);
      setMessage({ text: "Preferências salvas.", ok: true });
      setTimeout(() => setMessage(null), 2500);
    } catch (err) {
      setPrefs(prefs);
      setMessage({ text: err instanceof ApiError ? err.message : "Erro ao salvar", ok: false });
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <Section title="Notificações" icon={<Bell className="h-4 w-4" />}>
      {message && (
        <div
          className={[
            "rounded-lg border px-3 py-2 text-sm",
            message.ok
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          ].join(" ")}
        >
          {message.text}
        </div>
      )}
      <div className="card-soft p-5">
        <div className="flex flex-col gap-3">
          {prefs && NOTIF_ROWS.map((row) => (
            <ToggleRow
              key={row.key}
              title={row.title}
              description={row.description}
              checked={prefs[row.key]}
              onCheckedChange={(v) => toggle(row.key, v)}
            />
          ))}
        </div>
      </div>
    </Section>
  );
}

// --- Página principal ---
export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<TabId>("perfil");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dados do profissional, segurança e preferências.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
        {/* Nav lateral */}
        <nav className="flex flex-col gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                tab === t.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
              ].join(" ")}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex flex-col gap-6">
          {tab === "perfil" && <PerfilTab />}
          {tab === "seguranca" && <SegurancaTab />}
          {tab === "notificacoes" && <NotificacoesTab />}
        </div>
      </div>
    </div>
  );
}
