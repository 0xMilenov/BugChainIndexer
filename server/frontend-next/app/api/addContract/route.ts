import { NextRequest, NextResponse } from "next/server";

const getBackendUrl = (request: NextRequest) => {
  const host = request.headers.get("host") ?? request.nextUrl.host ?? "";
  if (host.includes("localhost")) return "http://localhost:8005";
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";
};

export async function POST(request: NextRequest) {
  const backendUrl = getBackendUrl(request);
  const bodyText = await request.text();
  try {
    const res = await fetch(`${backendUrl}/addContract`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: bodyText,
      cache: "no-store",
    });
    const responseText = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = { ok: false, error: responseText || "Internal Server Error" };
    }
    return NextResponse.json(parsed, { status: res.status });
  } catch (err) {
    console.error("[api/addContract] Backend unreachable:", err);
    return NextResponse.json(
      { ok: false, error: "Backend unreachable" },
      { status: 502 }
    );
  }
}
