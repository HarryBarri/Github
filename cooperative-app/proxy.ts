import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";

const PUBLIC_ROUTES = ["/login", "/forgot-password", "/reset-password"];

const ROUTE_ROLES: Record<string, UserRole[]> = {
  "/dashboard/settings": ["president", "superadmin"],
  "/dashboard/loans/products": ["president", "superadmin"],
  "/dashboard/members/new": ["treasurer", "secretary", "president", "superadmin"],
  "/dashboard/dividends": ["president", "treasurer", "superadmin"],
  "/dashboard/reports": ["loan_officer", "treasurer", "secretary", "president", "superadmin"],
};

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const path = nextUrl.pathname;

  if (PUBLIC_ROUTES.some((r) => path.startsWith(r))) {
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  const role = session.user.role;
  for (const [route, allowed] of Object.entries(ROUTE_ROLES)) {
    if (path.startsWith(route) && !allowed.includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/api/((?!auth).*)"],
};
