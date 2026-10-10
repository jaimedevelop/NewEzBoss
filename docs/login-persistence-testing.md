# Login persistence testing

Localhost supports persisted Auth0 sessions. Keep the exact origin stable: localhost:5173, localhost:5174, and 127.0.0.1 have separate browser storage. Alpha has its own storage too. Sign in once on each origin; use a normal browser profile and keep site data.

## Auth0 configuration

Verify the SPA has Refresh Token grant and Refresh Token Rotation enabled. Verify the API allows offline access. The code requests offline_access and saves the SDK cache in localStorage. Add the exact localhost and alpha origins to Allowed Web Origins and Allowed Logout URLs, and their callback URLs to Allowed Callback URLs. Review refresh-token idle/absolute lifetimes: expiration requires reconnecting, and cannot be fixed by keeping the access token forever.

Reference: https://auth0.com/docs/secure/tokens/refresh-tokens/use-refresh-token-rotation

## Real renewal test (run on localhost, then alpha after deployment)

1. Sign in. Open DevTools Network and enable Preserve log. Load Estimates or Clients and confirm its authenticated API request returns 200.
2. Reload, then close and reopen the tab. Expect the same account without entering credentials.
3. Leave the app open beyond the API access-token lifetime. For a faster test, use a separate Auth0 test API/application with a short token lifetime (for example two minutes), then sign in again to get a newly issued token. Changing the lifetime does not shorten tokens already issued.
4. Load fresh data in Estimates or Clients. Expect an Auth0 POST /oauth/token using grant_type=refresh_token, returning 200, followed by an authenticated API request returning 200. A successful reload before token expiration does not prove renewal works.
5. Repeat the wait with two tabs open, and repeat in the browsers your testers use, including one that blocks third-party cookies. Valid refresh-token renewal should not depend on iframe cookies.
6. Repeat after leaving the browser closed overnight, within the configured refresh-token lifetime.

## Recovery and failure tests

- Revoke the test account's refresh tokens using Auth0's authorized management tools, or let their configured lifetime expire. An existing Auth0 cookie may still silently recover the session; that is also a pass. If renewal fails, expect Continue sign in. Click it: the app should reconnect and return to the previous route, without requiring Sign out first. Credentials may be required if the Auth0 session has also expired.
- Switch Network offline before a data load. A network outage should not force logout. Restore connectivity and retry. For startup account-request failures, use Try again.
- Sign out explicitly, then reload: expect the public landing page, without the previous account's data.

## Diagnosing tester reports

Record the origin, browser, time since last login, exact on-screen error, and failing request path/status. Auth0 /oauth/token invalid_grant or missing_refresh_token points to renewal; an API 401/403 points to rejected authorization; a 5xx points to the API; Firebase invalid-custom-token is a separate legacy bridge problem. Match the report time to Auth0 tenant logs. Do not share tokens or an unredacted HAR.

## Local automated checks

- node --test tests/apiAuth.test.cjs
- node --test tests/authBridge.browser.test.cjs (requires Playwright; set PLAYWRIGHT_MODULE to its installed module path if necessary)
- npm run build

The mocked tests cover error routing and session isolation. They do not verify Auth0 tenant configuration or real refresh-token exchanges.
