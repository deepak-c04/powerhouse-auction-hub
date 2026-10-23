# Security audit notes

This copy was reviewed before static hosting.

## Checks completed

- Searched all site files for API keys, payment keys, passwords, bearer tokens, and private keys.
- Confirmed there is no package manifest or server-side dependency tree to audit.
- Reviewed executable inline JavaScript for syntax errors: 255 scripts checked, no syntax errors found.
- Checked for dangerous URL schemes, iframes, remote API calls, WebSockets, and dynamic code execution.
- Checked user-controlled rendering paths and confirmed the main display helpers escape HTML characters.
- Added a strict cross-origin referrer policy to the HTML pages.
- Strengthened links opened in a new tab with `noopener noreferrer`.
- Limited pasted auction-result codes to 200,000 characters before decoding.

## Important limitations

- This is a static front end. It cannot enforce authentication, authorization, bidding rules, payment security, rate limiting, or data integrity by itself.
- The live auction/chat features call `window.claude.use("db")`; their security depends on the Claude artifact runtime and its database rules. Those rules are not present in this ZIP and cannot be audited here.
- A normal static host will publish the pages, but the live rooms may not connect unless their backend is rebuilt.
- Hosting security headers such as Content-Security-Policy, HSTS, and Permissions-Policy must be configured by the hosting provider. Meta tags cannot fully replace those HTTP headers.
- No security review can guarantee that a public website is impossible to hack. Do not add payment keys, database credentials, or admin secrets to these HTML files.
