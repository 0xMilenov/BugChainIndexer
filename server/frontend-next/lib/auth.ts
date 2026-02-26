export interface AuthUser {
  username: string;
  avatar_url: string | null;
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
  };
}

export function getLoginUrl(): string {
  return "/auth/github";
}

export function getLogoutUrl(): string {
  return "/auth/logout";
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
