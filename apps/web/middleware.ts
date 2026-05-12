// Refs: SPEC.md §9 US-1.1 — protection routes (app), redirect /login si non authentifié
import { auth } from "./auth";

export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const { pathname } = req.nextUrl;

  if (!isAuthenticated && !pathname.startsWith("/login")) {
    return Response.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
