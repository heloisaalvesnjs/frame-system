"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  User,
  Bell,
  Lock,
  Users,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import {
  api,
  ApiError,
  setSession,
  getStoredUser,
  getTeamMembers,
  inviteTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
  type Nutritionist,
  type TeamMember,
} from "@/lib/api";

// --- Abas disponíveis ---
type TabId = "perfil" | "seguranca" | "notificacoes" | "equipe";

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "perfil",       label: "Perfil",        icon: <User className="h-4 w-4" /> },
  { id: "seguranca",    label: "Segurança",      icon: <Lock className="h-4 w-4" /> },
  { id: "notificacoes", label: "Notificações",   icon: <Bell className="h-4 w-4" /> },
  { id: "equipe",       label: "Equipe",         icon: <Users className="h-4 w-4" /> },
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
      if (stored && token && !("is_team_member" in stored)) {
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

// --- Helpers de equipe ---
const ROLE_LABEL: Record<TeamMember["role"], string> = {
  admin: "Admin",
  receptionist: "Recepcionista",
  viewer: "Visualizador",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      title="Copiar link"
      className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2/60 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado!" : "Copiar link"}
    </button>
  );
}

function InviteDialog({
  onClose,
  onInvited,
}: {
  onClose: () => void;
  onInvited: (member: TeamMember) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamMember["role"]>("receptionist");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<TeamMember | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const member = await inviteTeamMember(email, role);
      setCreated(member);
      onInvited(member);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao convidar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="card-soft w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-base font-semibold">Convidar pessoa</h2>

        {created ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
              Convite criado com sucesso!
            </div>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Envie este link para <strong>{created.email}</strong>:</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2/60 px-3 py-2">
                <span className="flex-1 truncate text-xs text-muted-foreground">{created.invite_link}</span>
                {created.invite_link && <CopyButton text={created.invite_link} />}
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">E-mail</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colaborador@clinica.com.br"
                className="h-10 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Papel</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as TeamMember["role"])}
                className="h-10 rounded-lg border border-border bg-surface-2/60 px-3 text-sm outline-none focus:border-primary/50"
              >
                <option value="admin">Admin — acesso total</option>
                <option value="receptionist">Recepcionista — atendimento e agenda</option>
                <option value="viewer">Visualizador — só leitura</option>
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
              >
                {saving ? "Convidando..." : "Enviar convite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function EquipeTab() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    getTeamMembers()
      .then(setMembers)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erro ao carregar equipe"))
      .finally(() => setLoading(false));
  }, []);

  async function handleRemove(id: string) {
    try {
      await removeTeamMember(id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      setConfirmDelete(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao remover");
    }
  }

  async function handleRoleChange(id: string, role: TeamMember["role"]) {
    try {
      await updateTeamMemberRole(id, role);
      setMembers((prev) => prev.map((m) => m.id === id ? { ...m, role } : m));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao atualizar papel");
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <>
      {showInvite && (
        <InviteDialog
          onClose={() => setShowInvite(false)}
          onInvited={(member) => {
            setMembers((prev) => [member, ...prev]);
          }}
        />
      )}
      <Section title="Equipe" icon={<Users className="h-4 w-4" />}>
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="card-soft p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Membros com acesso aos dados deste workspace
            </p>
            <button
              onClick={() => setShowInvite(true)}
              className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110"
            >
              + Convidar pessoa
            </button>
          </div>

          {members.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhum membro convidado ainda.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-2/40 px-4 py-3"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {(m.name ?? m.email).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {m.name ?? (
                        <span className="italic text-muted-foreground">Convite pendente</span>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                  </div>

                  {/* Badge de status */}
                  <span
                    className={[
                      "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                      m.status === "active"
                        ? "bg-primary/15 text-primary"
                        : "bg-amber-500/15 text-amber-600",
                    ].join(" ")}
                  >
                    {m.status === "active" ? "Ativo" : "Pendente"}
                  </span>

                  {/* Select de papel */}
                  {m.status === "active" ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value as TeamMember["role"])}
                      className="h-8 shrink-0 rounded-lg border border-border bg-surface-2/60 px-2 text-xs outline-none focus:border-primary/50"
                    >
                      <option value="admin">Admin</option>
                      <option value="receptionist">Recepcionista</option>
                      <option value="viewer">Visualizador</option>
                    </select>
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {ROLE_LABEL[m.role]}
                    </span>
                  )}

                  {/* Link de convite (pendente) */}
                  {m.status === "pending" && m.invite_link && (
                    <CopyButton text={m.invite_link} />
                  )}

                  {/* Remover — com confirmação inline */}
                  {confirmDelete === m.id ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Remover?</span>
                      <button
                        onClick={() => handleRemove(m.id)}
                        className="h-7 rounded-md bg-destructive px-2.5 text-xs font-semibold text-white hover:brightness-110"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="h-7 rounded-md border border-border px-2.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(m.id)}
                      title="Remover membro"
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>
    </>
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
          {tab === "equipe" && <EquipeTab />}
        </div>
      </div>
    </div>
  );
}
