const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TOKEN_KEY = "frame_token";
const USER_KEY = "frame_user";

export type Nutritionist = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  is_master: boolean;
};

export type TeamMemberUser = {
  is_team_member: true;
  name: string;
  role: "admin" | "receptionist" | "viewer";
  nutritionist_name: string;
  email?: string;
};

export type StoredUser = Nutritionist | TeamMemberUser;

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: StoredUser) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError("Sessão expirada", 401);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.error ?? "Erro inesperado", res.status);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export async function login(email: string, password: string) {
  // Tenta primeiro o login do dono (nutricionista)
  try {
    const data = await request<{ token: string; nutritionist: Nutritionist }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    );
    setSession(data.token, data.nutritionist);
    return data.nutritionist;
  } catch (err) {
    // Se foi 401, tenta como membro de equipe
    if (err instanceof ApiError && err.status === 401) {
      const teamData = await request<{ token: string; name: string; role: string; nutritionist_name: string }>(
        "/api/team/login",
        { method: "POST", body: JSON.stringify({ email, password }) }
      );
      const teamUser: TeamMemberUser = {
        is_team_member: true,
        name: teamData.name,
        role: teamData.role as TeamMemberUser["role"],
        nutritionist_name: teamData.nutritionist_name,
        email,
      };
      setSession(teamData.token, teamUser);
      return teamUser;
    }
    throw err;
  }
}

// --- API de equipe ---
export type TeamMember = {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "receptionist" | "viewer";
  status: "pending" | "active";
  created_at: string;
  invite_link?: string;
};

export async function getTeamMembers(): Promise<TeamMember[]> {
  const data = await request<{ members: TeamMember[] }>("/api/team");
  return data.members;
}

export async function inviteTeamMember(email: string, role: TeamMember["role"]): Promise<TeamMember> {
  const data = await request<{ member: TeamMember }>("/api/team/invite", {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
  return data.member;
}

export async function removeTeamMember(memberId: string): Promise<void> {
  await request("/api/team/" + memberId, { method: "DELETE" });
}

export async function updateTeamMemberRole(memberId: string, role: TeamMember["role"]): Promise<void> {
  await request("/api/team/" + memberId + "/role", {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function getInviteInfo(token: string): Promise<{ member: { id: string; email: string; role: string; status: string; nutritionist_name: string } }> {
  return request("/api/team/join/" + token);
}

export async function acceptInvite(token: string, name: string, password: string): Promise<{ token: string; name: string; role: string; nutritionist_name: string }> {
  return request("/api/team/join/" + token, {
    method: "POST",
    body: JSON.stringify({ name, password }),
  });
}
