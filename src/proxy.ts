import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public files
     */
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
