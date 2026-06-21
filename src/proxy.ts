import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/journal/:path*",
    "/analytics/:path*",
    "/strategy/:path*",
    "/settings/:path*",
    "/violations/:path*",
    "/risk-calculator/:path*",
  ],
};
