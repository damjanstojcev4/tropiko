# Tropiko performance and reload checks

Date: 17 October 2026. Chrome running locally against Next.js 15.5.28.

## The reported reload failure was reproduced

The original development site returned its HTML with HTTP 200 but failed to serve these assets:

- `/_next/static/css/app/layout.css` — HTTP 404
- `/_next/static/chunks/main-app.js` — HTTP 404
- `/_next/static/chunks/app-pages-internals.js` — HTTP 404

The baseline screenshot shows an unstyled page with large images. This explains why a lettuce image could occupy the mobile screen. The original measurements are retained in `development.json`, but they must not be compared as valid page-performance results because CSS and JavaScript were missing.

Development and production previously shared `.next`. Running a production build while the development server was active replaced files that its generated HTML still referenced. `next.config.ts` now uses `.next-dev` for development and `.next` for production. The dev server regenerated its assets; all three assets then loaded successfully. A production build also completed while the development measurements ran, without recurring asset failures.

## Production measurements

Three independent browser contexts per profile, with the browser cache disabled. Values below are medians. Server caches were not reset.

| Measurement | Mobile | Desktop |
|---|---:|---:|
| First Contentful Paint | 0.79 s | 0.10 s |
| Largest Contentful Paint | 1.62 s | 0.30 s |
| Cumulative Layout Shift | 0.000 | 0.000 |
| Observed long-task blocking* | 145 ms | 0 ms |
| Browser crashes / unhandled errors | 0 | 0 |
| Failed requests / HTTP errors | 0 | 0 |

Mobile: 390 × 844 viewport, 4× CPU slowdown, 1.6 Mbps download, 750 Kbps upload, and 150 ms emulated latency. Desktop: 1440 × 900, without throttling. LCP was observed for nine seconds after DOMContentLoaded on mobile and four seconds on desktop. All twelve product images loaded in each corrected run. No horizontal overflow was observed.

*Long-task blocking is the sum of each observed task's duration beyond 50 ms during the observation window. It is a diagnostic measure, not a Lighthouse Total Blocking Time score. These are local browser measurements, not field Core Web Vitals or a Lighthouse score. Interaction to Next Paint was not measured.

Corrected development medians: mobile FCP 1.04 s and LCP 1.76 s; desktop FCP 0.24 s and LCP 0.66 s. Development shipped roughly 2.06 MB of same-origin data in the completed desktop sample versus 142 KB in production. Those transfer figures exclude cross-origin image bytes and should not be treated as full page weight. On the throttled development connection, scripts may still be downloading when content is already visible; production should be used for user-facing performance comparisons.

## Functional checks

- Mobile hamburger navigation starts hidden, opens on tap, and closes after choosing a page.
- Switching from vegetables to fruit shows 5 vegetable products and 7 fruit products respectively.
- Five repeated fruit-page reloads passed in development and five in production, with the header and catalog visible on every reload.
- No page crashes, unhandled browser exceptions, or local asset HTTP errors occurred after the fix.
- All ten routes below returned HTTP 200, rendered their expected shell, and had no horizontal overflow or viewport-sized product images:
  - `/`, `/fruit`, `/vegetables`, `/sale`, `/contact`
  - `/admin`, `/admin/products`, `/admin/products/new`, `/admin/products/banana/edit`, `/admin/login`
- `npm run build` and `npm run lint` passed.

## Files and repeat runs

- `development.json`: broken original baseline; asset errors are the main evidence.
- `development-fixed.json`: corrected development measurements and route checks.
- `production.json`: production measurements and route checks.
- `development-mobile.png`: original unstyled screenshot.
- `development-fixed-mobile.png`, `production-mobile.png`, and matching desktop screenshots: corrected captures.

The runner is `scripts/performance/measure.cjs`. It uses Playwright from a local installation or the bundled Codex runtime, and Chrome from its standard Windows path. Set `CHROME_PATH` for another Chrome location.

With the dev server running, repeat its checks with:

```powershell
node scripts/performance/measure.cjs http://localhost:3000 development-fixed
```

For production, run `npm run build`, then `npm run start -- --port 3100` in another terminal, followed by:

```powershell
node scripts/performance/measure.cjs http://localhost:3100 production
```

To rerun only navigation, reload, and route checks against an existing result file, append `--interactions-only`.
