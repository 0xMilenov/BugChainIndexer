import { NextRequest, NextResponse } from "next/server";

const getBackendUrl = (request: NextRequest) => {
  const host = request.headers.get("host") ?? request.nextUrl.host ?? "";
  if (host.includes("localhost")) return "http://localhost:8005";
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";
};

export async function GET(request: NextRequest) {
  const backendUrl = getBackendUrl(request);
  const cookieHeader = request.headers.get("cookie") || "";

  try {
    const res = await fetch(`${backendUrl}/auth/me`, {
      method: "GET",
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[auth/me] Backend unreachable:", err);
    return NextResponse.json(
      { ok: false, error: "Backend unreachable" },
      { status: 502 }
    );
  }
}
