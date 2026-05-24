import { NextRequest, NextResponse } from "next/server";

const getBackendUrl = (request: NextRequest) => {
  const host = request.headers.get("host") ?? request.nextUrl.host ?? "";
  if (host.includes("localhost")) return "http://localhost:8005";
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";
};

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const backendUrl = getBackendUrl(request);
  const cookieHeader = request.headers.get("cookie") || "";
  const { path } = await params;
  const suffix = (path || []).map(encodeURIComponent).join("/");

  try {
    const res = await fetch(`${backendUrl}/bookmarks/${suffix}`, {
      method: "DELETE",
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[api/bookmarks/delete] Backend unreachable:", err);
    return NextResponse.json({ ok: false, error: "Backend unreachable" }, { status: 502 });
  }
}
