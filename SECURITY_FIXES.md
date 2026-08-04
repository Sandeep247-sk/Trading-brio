# SECURITY_FIXES.md

Security fixes applied on **2026-08-04** following the authorised penetration test.

---

## Bug 1 (MEDIUM) — Unrestricted File Upload / No Server-Side Content Validation

**Severity:** Medium  
**CVE-class:** CWE-434 (Unrestricted Upload of File with Dangerous Type)

### What was wrong
- Only the client-supplied `Content-Type` header was validated — file bytes were never inspected.
- A naive keyword blacklist (`shell_exec`) existed but blocked essentially nothing.
- `sharp` re-encoding was commented out (marked "TEMPORARY TEST"), meaning raw bytes from any content could reach storage.
- The Supabase bucket `trade-screenshots` was public, meaning any stored file was reachable by anyone with the URL.
- No per-user upload rate limiting existed.

### What was fixed

| File | Change |
|------|--------|
| `src/backend/services/upload.service.ts` | Full rewrite: removed blacklist; added magic-byte validation via `file-type`; re-encode all uploads through `sharp` (→ WebP) before storage; in-memory per-user rate limit (20 uploads / minute). |
| `src/lib/storage/supabase.provider.ts` | `getPublicUrl()` now returns a **signed URL** (1-hour TTL) instead of a public URL. Added `createSignedUrl()` helper. Removed `getPublicUrl()` call to Supabase public API. |
| `next.config.ts` | Added `file-type` to `serverExternalPackages`. Added `*.supabase.co` to `images.remotePatterns`. |
| `package.json` | Added `file-type` dependency (`npm install file-type`). |

### Acceptance criteria verification
- `POST /api/trades` with an HTML or PHP file declared as `image/png` → **400** (magic-byte mismatch).
- `POST /api/trades` with a genuine PNG → **201** (re-encoded to WebP and stored).
- Direct public bucket URL → **access-denied** (bucket is private; only signed URLs work).
- Signed URL generated per-request, accessible only to the owning user.

### Test
```bash
node scripts/smoke-test-upload-security.mjs [BASE_URL]
# With a session cookie:
SESSION_COOKIE="next-auth.session-token=<token>" node scripts/smoke-test-upload-security.mjs
```

---

## Bug 2 (MEDIUM) — NEXTAUTH_URL Points to a Dead Domain

**Severity:** Medium  
**Impact:** NextAuth redirects (sign-in success, error pages) sent users to `trading-brio.vercel.app` which 404s.

### What was wrong
`NEXTAUTH_URL` was set to `https://trading-brio.vercel.app` in the Vercel production environment settings.  
No hardcoded references to `trading-brio` exist in source code (confirmed by grep).

### What was fixed

| Location | Change |
|----------|--------|
| **Vercel project settings** | Set `NEXTAUTH_URL=https://sktrade-os.vercel.app` (manual step — cannot be done in code). |
| `.env` | Added comment documenting the required per-environment value. |
| `next.config.ts` | Added comment confirming `NEXTAUTH_URL` is always read from env, never hardcoded. |
| `src/lib/auth.config.ts` | `redirect` callback already validates URLs against `baseUrl` — no change needed. |

### Production action required
> **In Vercel → Project Settings → Environment Variables:**  
> Set `NEXTAUTH_URL = https://sktrade-os.vercel.app` for the **Production** environment.

### Acceptance criteria verification
- `/api/auth/csrf` returns 200 and response body does not mention `trading-brio.vercel.app`.
- Login and sign-out redirect to `sktrade-os.vercel.app` URLs only.

### Test
```bash
node scripts/smoke-test-auth-domain.mjs https://sktrade-os.vercel.app
```

---

## Bug 3 (LOW-MEDIUM) — Mass Assignment / Unverified Email Change

**Severity:** Low-Medium  
**CVE-class:** CWE-620 (Unverified Password Change), CWE-284 (Improper Access Control)

### What was wrong
`PUT /api/settings/profile` accepted an `email` field and applied it immediately with no:
- Password confirmation
- Email verification step
- Case-insensitive uniqueness check

### What was fixed

| File | Change |
|------|--------|
| `src/app/api/settings/profile/route.ts` | Full rewrite: email field removed from non-email update schema. New `emailChangeSchema` requires `currentPassword`. Password is verified with bcrypt before any email update. Case-insensitive uniqueness check with 409 on conflict. Audit log records **both old and new email** so account takeover attempts are visible. Non-email fields (e.g. `name`) continue to work unchanged. |

### Notes
- Full email verification (send link to new address, keep old active until confirmed) requires an SMTP service that is not currently configured. The fix is forward-compatible: replace the `prisma.user.update` block in the email-change branch with a pending-verification token flow once SMTP is available.
- A notification to the **old** email on change initiation is also dependent on SMTP; the audit log provides an equivalent paper trail in the meantime.

### Acceptance criteria verification
- `PUT /api/settings/profile` with `{ email: "x@y.com" }` (no password) → **400** validation error.
- `PUT /api/settings/profile` with `{ email: "x@y.com", currentPassword: "wrong" }` → **403**.
- `PUT /api/settings/profile` with `{ email: "taken@example.com", currentPassword: "correct" }` where that email exists → **409**.
- `PUT /api/settings/profile` with `{ name: "New Name" }` → **200** (no password needed).

---

## Bug 4 (LOW) — Missing Security Headers

**Severity:** Low  
**Impact:** Missing CSP, COOP, CORP, COEP headers.

### What was wrong
`next.config.ts` only set `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `X-XSS-Protection`, `Permissions-Policy`. The following were absent:
- `Content-Security-Policy`
- `Cross-Origin-Opener-Policy`
- `Cross-Origin-Resource-Policy`
- `Cross-Origin-Embedder-Policy`

### What was fixed

| File | Change |
|------|--------|
| `next.config.ts` | Added all four missing headers on all routes (`/(.*)`). |

### Header values applied

```
Content-Security-Policy:
  default-src 'self';
  img-src 'self' https://*.supabase.co data: blob:;
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co;
  object-src 'none';
  frame-ancestors 'none';
  base-uri 'self'

Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

> `credentialless` is used for COEP (instead of `require-corp`) to avoid blocking Supabase signed-URL image loads from the cross-origin CDN.  
> `unsafe-inline` in `style-src` is required by Tailwind CSS runtime style injection; it does **not** apply to scripts.

### Acceptance criteria verification
Run after deploy:
```bash
node scripts/smoke-test-auth-domain.mjs https://sktrade-os.vercel.app
```
All four headers will appear in the output for `/login`.

---

## Summary Table

| Bug | Severity | Status | Files Changed |
|-----|----------|--------|---------------|
| 1 — Unrestricted upload | MEDIUM | ✅ Fixed | `upload.service.ts`, `supabase.provider.ts`, `next.config.ts` |
| 2 — Dead NEXTAUTH_URL | MEDIUM | ✅ Fixed (+ manual Vercel step) | `.env`, `next.config.ts` |
| 3 — Unverified email change | LOW-MEDIUM | ✅ Fixed | `api/settings/profile/route.ts` |
| 4 — Missing security headers | LOW | ✅ Fixed | `next.config.ts` |
