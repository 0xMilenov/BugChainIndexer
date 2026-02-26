import { NextRequest, NextResponse } from "next/server";

const getBackendUrl = (request: NextRequest) => {
  const host = request.headers.get("host") ?? request.nextUrl.host ?? "";
  if (host.includes("localhost")) return "http://localhost:8005";
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";
};

/**
 * Proxy /api/contract/* to backend with cookie forwarding.
 * Next.js rewrites do NOT forward cookies; this route handler does.
 */
async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const backendPath = path.join("/");
  const backendUrl = getBackendUrl(request);
  const url = `${backendUrl}/contract/${backendPath}`;
  const cookieHeader = request.headers.get("cookie") || "";

  const headers: Record<string, string> = {};
  if (cookieHeader) headers.cookie = cookieHeader;
  const contentType = request.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;

  try {
    const init: RequestInit = {
      method: request.method,
      headers,
      cache: "no-store",
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      const body = await request.text();
      if (body) init.body = body;
    }
    const res = await fetch(url, init);
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[api/contract] Backend unreachable:", err);
    return NextResponse.json(
      { ok: false, error: "Backend unreachable" },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
