# EzBoss

EzBoss creado por Joaquin, 9/10/2025

## Persistent sign-in setup

The web client uses Auth0 rotating refresh tokens so a user who has already
signed in remains signed in when they revisit EzBoss in the same browser. This
is intentionally limited to that browser; signing out still clears the local
Auth0 cache and ends the Auth0 session.

Before deploying this change, enable **Refresh Token Rotation** for the EzBoss
Single Page Application in Auth0 Dashboard → Applications → EzBoss → Advanced
Settings → Grant Types / Refresh Token Rotation. Use a finite absolute lifetime
and an inactivity lifetime appropriate for the product (for example, 30 days
absolute and 7 days idle), enable reuse detection, and do not enable the legacy
non-rotating refresh-token flow. Restrict the application's Allowed Callback
URLs, Allowed Logout URLs, and Allowed Web Origins to the actual EzBoss
origins; do not use wildcards in production.

Because a browser-persistent session is stored in `localStorage`, EzBoss must
maintain a strong Content Security Policy and avoid untrusted script injection.
Users should sign out on shared devices.
