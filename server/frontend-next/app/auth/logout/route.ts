import { NextRequest, NextResponse } from "next/server";

const getBackendUrl = (request: NextRequest) => {
  const host = request.headers.get("host") ?? request.nextUrl.host ?? "";
  if (host.includes("localhost")) return "http://localhost:8005";
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";
};

export async function GET(request: NextRequest) {
  const backendUrl = getBackendUrl(request);
  const frontendUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    request.nextUrl.origin ||
    "http://localhost:3000";

  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const res = await fetch(`${backendUrl}/auth/logout`, {
      method: "GET",
      headers: { cookie: cookieHeader },
      redirect: "manual",
    });

    if (res.status === 302) {
      const location = res.headers.get("location");
      if (location) {
        const redirectRes = NextResponse.redirect(location);
        const setCookies = res.headers.getSetCookie?.() ?? [];
        for (const c of setCookies) {
          redirectRes.headers.append("set-cookie", c);
        }
        return redirectRes;
      }
    }
  } catch (err) {
    console.error("[auth/logout] Backend unreachable:", err);
  }

  return NextResponse.redirect(frontendUrl, 302);
}
