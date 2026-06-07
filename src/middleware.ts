import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const USER = process.env.BASIC_AUTH_USER;
const PASSWORD = process.env.BASIC_AUTH_PASSWORD;

export function middleware(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Basic ")) {
    const base64 = authorization.slice("Basic ".length);
    const decoded = atob(base64);
    const colon = decoded.indexOf(":");
    const user = decoded.slice(0, colon);
    const pass = decoded.slice(colon + 1);

    if (user === USER && pass === PASSWORD) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Talk To Me"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
