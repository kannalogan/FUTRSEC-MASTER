---
name: SSRF-guarded URL fetch
description: How user-supplied URL fetching must be guarded against SSRF, including the redirect re-validation trap.
---

# SSRF-guarded URL fetch

Any endpoint that fetches a user-supplied URL server-side (resume URLs, webhook tests, image imports, etc.) must validate every network hop, not just the first.

**Rule:** Validate the URL host against the block list (private/loopback/link-local/unique-local/CGNAT, plus `localhost`, `.local`, `.internal`), resolving DNS and checking *all* returned A/AAAA records. Then fetch with `redirect: "manual"` and re-run the same validation on each `Location` target before following it, with a max-hop cap.

**Why:** `fetch(url, { redirect: "follow" })` silently follows 30x responses. A public URL that passes the initial check can redirect to `127.0.0.1`, RFC1918, or cloud metadata IPs, fully bypassing the guard. The initial-host check alone is not enough — this was a real review finding.

**How to apply:** Restrict to http(s) only, cap body size and timeout, and treat IPv4-mapped IPv6 (`::ffff:a.b.c.d`) by re-checking the embedded IPv4. The canonical implementation lives in the resume fetch helper under the api-server AI lib — reuse `assertSafeUrl` + a manual-redirect fetch loop rather than reinventing it.
