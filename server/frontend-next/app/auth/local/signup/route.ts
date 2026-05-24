import { NextRequest, NextResponse } from "next/server";

const getBackendUrl = (request: NextRequest) => {
  const host = request.headers.get("host") ?? request.nextUrl.host ?? "";
  if (host.includes("localhost")) return "http://localhost:8005";
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";
};

export async function POST(request: NextRequest) {
  const backendUrl = getBackendUrl(request);
  const body = await request.text();
  const cookieHeader = request.headers.get("cookie") || "";

  try {
    const res = await fetch(`${backendUrl}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body,
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    const nextRes = NextResponse.json(data, { status: res.status });
    const setCookies = res.headers.getSetCookie?.() ?? [];
    for (const c of setCookies) nextRes.headers.append("set-cookie", c);
    return nextRes;
  } catch (err) {
    console.error("[auth/local/signup] Backend unreachable:", err);
    return NextResponse.json({ ok: false, error: "Backend unreachable" }, { status: 502 });
  }
}
