export interface AuthUser {
  username: string;
  avatar_url: string | null;
  role?: string | null;
}

export async function fetchMe(signal?: AbortSignal): Promise<AuthUser | null> {
  const response = await fetch("/auth/me", {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  if (response.status === 401 || response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to load session (${response.status})`);
  }
  const data = await response.json();
  if (!data?.ok || !data?.username) return null;
  return {
    username: data.username,
    avatar_url: data.avatar_url ?? null,
    role: data.role ?? null,
  };
}

export function getLoginUrl(): string {
  return "/auth/login";
}

export function getSignupUrl(): string {
  return "/auth/signup";
}

export function getLogoutUrl(): string {
  return "/auth/logout";
}

export async function loginLocal(
  username: string,
  password: string
): Promise<AuthUser> {
  const response = await fetch("/auth/local/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.ok || !data?.user) {
    throw new Error(data?.error || `Login failed (${response.status})`);
  }
  return {
    username: data.user.username,
    avatar_url: data.user.avatar_url ?? null,
    role: data.user.role ?? null,
  };
}

export async function signupLocal(params: {
  username: string;
  password: string;
  accessCode: string;
}): Promise<AuthUser> {
  const response = await fetch("/auth/local/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.ok || !data?.user) {
    throw new Error(data?.error || `Signup failed (${response.status})`);
  }
  return {
    username: data.user.username,
    avatar_url: data.user.avatar_url ?? null,
    role: data.user.role ?? null,
  };
}

export async function fetchAuthStatus(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch("/auth/status", {
      credentials: "include",
      cache: "no-store",
      signal,
    });
    if (!response.ok) return false;
    const data = await response.json();
    return Boolean(data?.configured);
  } catch {
    return false;
  }
}
