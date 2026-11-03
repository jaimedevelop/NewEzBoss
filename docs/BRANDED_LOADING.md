# EzBoss loading behavior

## Startup and sign-in

Only startup/sign-in uses the logo completion reveal and page fade. The E, Z, B, O, S, S letters fade in sequentially while the double border fades/reveals from left to right; both finish at approximately 1.26 seconds. The logo holds until 1.42 seconds, then the cover fades away over 320 ms. Interaction unlocks after the fade at about 1.74 seconds. Reduced-motion users skip the reveal and fade.

`StartupWorkspace` in `src/App.tsx` explicitly passes authentication/account readiness to `EzBossLoadingProvider`, keyed by the signed-in identity. That boundary plays once per startup/login. Ordinary route changes, background requests, company selection and small saving indicators never drive the animation. Layout effects keep the initial destination frame covered before paint. Signing out and entering a new identity creates a new startup boundary.

## Pages and tabs

Page-level `EzBossLoader` instances now render static skeleton rows: a heading and four three-column rows. Data is displayed immediately when ready, without a completion screen, fade or artificial delay. Existing page-specific skeletons remain in place. The protected route Suspense boundary sits inside `Layout`, so lazy-loaded tabs preserve workspace navigation and display placeholders in the content area.

The explicitly branded startup loader and compact action indicators retain the solid, sharp-ended double-border snake (32% of the perimeter; a 2.8-second clockwise lap). Compact indicators inherit the surrounding text color for button contrast. `variant="brand"` opts into the logo; default page loaders use skeletons.

The transparent 741×221 `public/ezboss-loading.png` is cropped from the existing `public/EzBossLogo.png` at 230,101,741,221 and also bundled in the native apps. iOS labeled progress views and Android page indicators use static skeletons; native host transitions are driven by sign-in readiness rather than page-loader lifecycles. Android retains startup completion through company/tab changes and rearms after sign-out/session expiry.

## Regression fixture

Run `npm run dev`, then visit `/tests/fixtures/loading/index.html`. The fixture imports production components within React Strict Mode and is not a production build entry point.

- **Sign in** simulates authentication. `uncovered` must be zero; `covered` and `fadeFrames` must be positive. The destination becomes available when startup completion finishes.
- **Load tab** simulates a 700 ms data request. `covered` and `fadeFrames` must be zero; `skeletonFrames` and `uncovered` must be positive, confirming skeletons while pending and immediate destination display after readiness. Repeat without signing out to confirm no replay.
- **Save action** shows a compact indicator and must not trigger startup completion.
- Repeat at mobile widths and with reduced motion. Reduced motion intentionally skips the startup reveal/fade.

## Verification, November 2, 2026

- Production Vite build, TypeScript check, and unsigned generic-device iOS build passed. Android offline debug assembly passed; no emulator/simulator started.
- Desktop Strict Mode browser check: sign-in had zero uncovered frames, 81 covered frames and 18 fade frames. A subsequent tab had zero covered/fade frames, 43 skeleton frames, and 24 immediately visible destination frames.
- Mobile tab check uses the same fixture at 390×844. Native visual/device acceptance and authenticated production-route walkthroughs remain pending. No deployment or device installation performed.
- Standard ESLint crashes in the installed `@typescript-eslint/no-unused-expressions` rule. Targeted component lint passes with that broken rule disabled for the check; repository configuration is unchanged. Existing bundle-size/native warnings remain unrelated.
