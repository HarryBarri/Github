import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth is handled client-side via localStorage/sessionStorage.
// Allow all routes through — pages redirect to /login themselves if no session.
export default function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
