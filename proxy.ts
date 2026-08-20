import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/dashboard") && !request.cookies.get("me-access-token")?.value) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
