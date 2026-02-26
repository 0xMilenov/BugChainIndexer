import { cookies } from "next/headers";
import type { AuthUser } from "./auth";

const getBackendUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";
  if (process.env.NEXT_PUBLIC_APP_URL?.startsWith("http://localhost:") && url.includes(":8000")) {
    return "http://localhost:8005";
  }
  return url;
};

export async function getServerAuth(): Promise<{
  user: AuthUser | null;
  authConfigured: boolean;
}> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const backendUrl = getBackendUrl();
    const [meRes, statusRes] = await Promise.all([
      fetch(`${backendUrl}/auth/me`, {
        headers: cookieHeader ? { cookie: cookieHeader } : {},
        cache: "no-store",
      }),
      fetch(`${backendUrl}/auth/status`, { cache: "no-store" }),
    ]);

    const statusData = statusRes.ok ? await statusRes.json() : null;
    const authConfigured = Boolean(statusData?.configured);

    if (!meRes.ok || meRes.status === 401 || meRes.status === 404) {
      return { user: null, authConfigured };
    }

    const data = await meRes.json();
    if (!data?.ok || !data?.username) {
      return { user: null, authConfigured };
    }

    return {
      user: {
        username: data.username,
        avatar_url: data.avatar_url ?? null,
      },
      authConfigured,
    };
  } catch {
    return { user: null, authConfigured: false };
  }
}
