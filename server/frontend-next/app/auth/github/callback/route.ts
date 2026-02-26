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

  // Parse params - use request.url with origin as base (handles relative URLs)
  const url = new URL(request.url, request.nextUrl.origin);
  const searchParams = url.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // GitHub may send error in query params (e.g. redirect_uri_mismatch)
  const errorParam = searchParams.get("error");
  if (errorParam) {
    const desc = searchParams.get("error_description") || errorParam;
    const msg = errorParam === "redirect_uri_mismatch" ? "redirect_uri_mismatch" : encodeURIComponent(desc);
    return NextResponse.redirect(`${frontendUrl}/auth/error?message=${msg}`, 302);
  }

  // Must have code and state from GitHub - otherwise don't call backend
  if (!code || !state) {
    const landed = encodeURIComponent(url.toString());
    console.error("[auth/github/callback] Missing code or state. Landed URL:", url.toString(), "| searchParams:", Object.fromEntries(searchParams.entries()));
    return NextResponse.redirect(
      `${frontendUrl}/auth/error?message=missing_code_or_state&landed=${landed}`,
      302
    );
  }

  const backendCallbackUrl = `${backendUrl}/auth/github/callback?${searchParams.toString()}`;

  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const res = await fetch(backendCallbackUrl, {
      method: "GET",
      headers: { cookie: cookieHeader },
      redirect: "manual",
    });

    if (res.status === 302) {
      const location = res.headers.get("location");
      if (location) {
        const redirectRes = NextResponse.redirect(location);
        // Forward Set-Cookie from backend so session is set for the frontend origin
        const setCookies = res.headers.getSetCookie?.() ?? [];
        for (const c of setCookies) {
          redirectRes.headers.append("set-cookie", c);
        }
        return redirectRes;
      }
    }

    // Non-302: try to get error from response
    if (!res.ok) {
      let errMsg = "unknown";
      try {
        const data = await res.json();
        errMsg = encodeURIComponent(data?.error || errMsg);
      } catch {
        errMsg = encodeURIComponent(`HTTP ${res.status}`);
      }
      return NextResponse.redirect(`${frontendUrl}/auth/error?message=${errMsg}`, 302);
    }
  } catch (err) {
    console.error("[auth/github/callback] Backend unreachable:", err);
    return NextResponse.redirect(
      `${frontendUrl}/auth/error?message=backend_unreachable`,
      302
    );
  }

  return NextResponse.redirect(`${frontendUrl}/auth/error?message=unknown`, 302);
}
