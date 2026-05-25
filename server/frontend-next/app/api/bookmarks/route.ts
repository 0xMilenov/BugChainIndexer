import { NextRequest, NextResponse } from "next/server";

const getBackendUrl = (request: NextRequest) => {
  const configuredBackendUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (configuredBackendUrl) return configuredBackendUrl;
  const host = request.headers.get("host") ?? request.nextUrl.host ?? "";
  if (host.includes("localhost")) return "http://localhost:8005";
  return "http://localhost:8000";
};

async function proxy(request: NextRequest, method: "GET" | "POST") {
  const backendUrl = getBackendUrl(request);
  const cookieHeader = request.headers.get("cookie") || "";
  const body = method === "POST" ? await request.text() : undefined;

  try {
    const res = await fetch(`${backendUrl}/bookmarks`, {
      method,
      headers: {
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      body,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[api/bookmarks] Backend unreachable:", err);
    return NextResponse.json({ ok: false, error: "Backend unreachable" }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  return proxy(request, "GET");
}

export async function POST(request: NextRequest) {
  return proxy(request, "POST");
}
