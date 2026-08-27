import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const protectedPaths = ["/dashboard", "/technician/dashboard", "/register", "/job-cards", "/customers", "/vehicles", "/estimates", "/invoices", "/payments", "/followups", "/reports", "/settings"];
  const isProtected = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path));
  if (isProtected && !request.cookies.get("garage_refresh")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/technician/dashboard/:path*",
    "/register/:path*",
    "/job-cards/:path*",
    "/customers/:path*",
    "/vehicles/:path*",
    "/estimates/:path*",
    "/invoices/:path*",
    "/payments/:path*",
    "/followups/:path*",
    "/reports/:path*",
    "/settings/:path*"
  ]
};
