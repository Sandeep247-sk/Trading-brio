#!/usr/bin/env node
/**
 * smoke-test-auth-domain.mjs
 *
 * Bug 2 smoke test — verifies that /api/auth/csrf returns a response and
 * that any redirect URLs embedded in NextAuth pages point to the live domain,
 * not to any dead/old domain.
 *
 * Usage:
 *   node scripts/smoke-test-auth-domain.mjs [BASE_URL]
 *
 * Examples:
 *   node scripts/smoke-test-auth-domain.mjs                          # defaults to http://localhost:3000
 *   node scripts/smoke-test-auth-domain.mjs https://sktrade-os.vercel.app
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — one or more checks failed
 */

const BASE_URL = process.argv[2] || process.env.NEXTAUTH_URL || "http://localhost:3000";
const DEAD_DOMAIN = "trading-brio.vercel.app";

let failures = 0;

function pass(msg) {
  console.log(`  ✅  ${msg}`);
}

function fail(msg) {
  console.error(`  ❌  ${msg}`);
  failures++;
}

async function checkCsrfEndpoint() {
  console.log(`\n── /api/auth/csrf ──`);
  const url = `${BASE_URL}/api/auth/csrf`;
  let res;
  try {
    res = await fetch(url, { redirect: "manual" });
  } catch (err) {
    fail(`Could not connect to ${url}: ${err.message}`);
    return;
  }

  if (res.status === 200) {
    pass(`${url} returned 200`);
  } else {
    fail(`${url} returned ${res.status} (expected 200)`);
  }

  const body = await res.text();
  if (body.includes(DEAD_DOMAIN)) {
    fail(`Response body contains dead domain "${DEAD_DOMAIN}": ${body.substring(0, 200)}`);
  } else {
    pass(`Response body does not reference dead domain "${DEAD_DOMAIN}"`);
  }

  // Check for redirect Location header pointing at dead domain
  const location = res.headers.get("location") || "";
  if (location.includes(DEAD_DOMAIN)) {
    fail(`Redirect Location header points to dead domain: ${location}`);
  } else if (location) {
    pass(`Redirect Location (${location}) does not contain dead domain`);
  }
}

async function checkLoginPage() {
  console.log(`\n── /login ──`);
  const url = `${BASE_URL}/login`;
  let res;
  try {
    res = await fetch(url, { redirect: "manual" });
  } catch (err) {
    fail(`Could not connect to ${url}: ${err.message}`);
    return;
  }

  pass(`${url} returned ${res.status}`);

  const location = res.headers.get("location") || "";
  if (location.includes(DEAD_DOMAIN)) {
    fail(`Redirect from /login points to dead domain: ${location}`);
  } else if (location) {
    pass(`Redirect from /login (${location}) does not contain dead domain`);
  }
}

async function checkSecurityHeaders() {
  console.log(`\n── Security Headers (Bug 4) ──`);
  const url = `${BASE_URL}/login`;
  let res;
  try {
    res = await fetch(url, { redirect: "manual" });
  } catch (err) {
    fail(`Could not connect to ${url} for header check: ${err.message}`);
    return;
  }

  const required = [
    "content-security-policy",
    "cross-origin-opener-policy",
    "cross-origin-resource-policy",
    "cross-origin-embedder-policy",
  ];

  for (const header of required) {
    const value = res.headers.get(header);
    if (value) {
      pass(`${header}: ${value}`);
    } else {
      fail(`Missing header: ${header}`);
    }
  }
}

(async () => {
  console.log(`\nSmoke test against: ${BASE_URL}\n`);
  await checkCsrfEndpoint();
  await checkLoginPage();
  await checkSecurityHeaders();

  console.log(`\n${"─".repeat(50)}`);
  if (failures === 0) {
    console.log("✅  All checks passed.\n");
    process.exit(0);
  } else {
    console.error(`❌  ${failures} check(s) failed.\n`);
    process.exit(1);
  }
})();
