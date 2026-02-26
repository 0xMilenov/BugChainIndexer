import { NextRequest, NextResponse } from "next/server";

const getBackendUrl = (request: NextRequest) => {
  const host = request.headers.get("host") ?? request.nextUrl.host ?? "";
  // When on localhost, always use 8005 (run-local-ui.sh) to avoid production on 8000
  if (host.includes("localhost")) {
    return "http://localhost:8005";
  }
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";
};

export async function GET(request: NextRequest) {
  const backendUrl = getBackendUrl(request);
  const frontendUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    request.nextUrl.origin ||
    "http://localhost:3000";

  // If GitHub redirected here with code/state (wrong callback URL in GitHub app), forward to callback
  const searchParams = request.nextUrl.searchParams;
  if (searchParams.get("code")) {
    return NextResponse.redirect(
      `${frontendUrl.replace(/\/$/, "")}/auth/github/callback?${searchParams.toString()}`,
      302
    );
  }

  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const res = await fetch(`${backendUrl}/auth/github`, {
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

    if (res.status === 404) {
      return NextResponse.redirect(
        `${frontendUrl.replace(/\/$/, "")}/auth/error?message=not_configured`,
        302
      );
    }
  } catch (err) {
    console.error("[auth/github] Backend unreachable:", err);
    return NextResponse.redirect(
      `${frontendUrl}/auth/error?message=backend_unreachable`,
      302
    );
  }

  return NextResponse.redirect(`${frontendUrl}/auth/error?message=unknown`, 302);
}
