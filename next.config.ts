import type { NextConfig } from "next";

// ---------------------------------------------------------------------------
// Bug 2 fix: NEXTAUTH_URL must come from env — never hardcoded.
// In Vercel project settings set NEXTAUTH_URL=https://sktrade-os.vercel.app
// The local .env already has NEXTAUTH_URL=http://localhost:3000 which is fine.
// ---------------------------------------------------------------------------

const nextConfig: NextConfig = {
  // Security headers (Bug 4 fix)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // --- Pre-existing headers (DO NOT REMOVE) ---
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // --- New headers added by Bug 4 fix ---
          {
            // CSP: allow images from our own domain + Supabase CDN + data URIs.
            // script-src uses 'self' only (no unsafe-inline for scripts).
            // style-src permits 'unsafe-inline' because Tailwind injects styles at runtime.
            // object-src 'none' blocks Flash/plug-ins entirely.
            // frame-ancestors 'none' redundantly reinforces X-Frame-Options.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "img-src 'self' https://*.supabase.co data: blob:",
              "script-src 'self'",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          {
            // Using 'credentialless' instead of 'require-corp' to avoid
            // breaking Supabase signed-URL image loads from a cross-origin CDN.
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
        ],
      },
    ];
  },

  // Image optimization — Supabase CDN domain for Next/Image component
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },

  // Strict mode for catching bugs
  reactStrictMode: true,

  // Server external packages
  serverExternalPackages: ["argon2", "sharp", "file-type"],
};

export default nextConfig;
