const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))); }

const base = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || 'development';
const output = path.join(process.cwd(), 'reports', 'performance');
const interactionsOnly = process.argv.includes('--interactions-only');

async function observe(page) {
  await page.addInitScript(() => {
    window.__measurements = { lcp: 0, cls: 0, longTasks: [], paints: {} };
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) window.__measurements.lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__measurements.cls += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) window.__measurements.longTasks.push(entry.duration);
    }).observe({ type: 'longtask', buffered: true });
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) window.__measurements.paints[entry.name] = entry.startTime;
    }).observe({ type: 'paint', buffered: true });
  });
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const reportPath = path.join(output, `${label}.json`);
  const report = interactionsOnly ? JSON.parse(await fs.readFile(reportPath, 'utf8')) : { base, label, date: new Date().toISOString(), runs: [], interactions: {} };
  try {
    for (const mobile of (interactionsOnly ? [] : [true, false])) {
      for (let run = 1; run <= 3; run++) {
        const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
        const page = await context.newPage();
        const errors = [], failedRequests = [], badResponses = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('crash', () => errors.push('BROWSER PAGE CRASH'));
        page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
        page.on('response', response => { if (response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() }); });
        await observe(page);
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        if (mobile) {
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
          await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1600000 / 8, uploadThroughput: 750000 / 8 });
        }
        const response = await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(mobile ? 9000 : 4000);
        const metrics = await page.evaluate(() => {
          const measurement = window.__measurements;
          const navigation = performance.getEntriesByType('navigation')[0];
          const resources = performance.getEntriesByType('resource');
          return {
            ttfb: navigation.responseStart - navigation.startTime,
            fcp: measurement.paints['first-contentful-paint'] || null,
            lcp: measurement.lcp,
            cls: measurement.cls,
            blockingTime: measurement.longTasks.reduce((sum, duration) => sum + Math.max(0, duration - 50), 0),
            longTaskCount: measurement.longTasks.length,
            domContentLoaded: navigation.domContentLoadedEventEnd,
            requests: resources.length + 1,
            sameOriginTransferBytes: resources.filter(resource => resource.name.startsWith(location.origin)).reduce((sum, resource) => sum + resource.transferSize, navigation.transferSize),
            imageCount: document.images.length,
            loadedImages: [...document.images].filter(image => image.complete && image.naturalWidth > 0).length,
            horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
            stylesheetApplied: getComputedStyle(document.querySelector('.product-grid')).display === 'grid',
            imageBounds: [...document.querySelectorAll('.product-image img')].map(image => { const rect = image.getBoundingClientRect(); return { alt: image.alt, width: Math.round(rect.width), height: Math.round(rect.height), naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight }; }),
          };
        });
        const result = { profile: mobile ? 'mobile-4g-cpu4x' : 'desktop-unthrottled', run, status: response.status(), ...metrics, errors, failedRequests, badResponses };
        report.runs.push(result);
        if (run === 1) await page.screenshot({ path: path.join(output, `${label}-${mobile ? 'mobile' : 'desktop'}.png`), fullPage: true });
        console.log(JSON.stringify({ profile: result.profile, run, ttfb: metrics.ttfb, fcp: metrics.fcp, lcp: metrics.lcp, cls: metrics.cls, errors, failed: failedRequests.length, httpErrors: badResponses.length }));
        await context.close();
      }
    }
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = [], badResponses = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('crash', () => errors.push('BROWSER PAGE CRASH'));
    page.on('response', response => { if (response.status() >= 400 && new URL(response.url()).origin === new URL(base).origin) badResponses.push({ url: response.url(), status: response.status() }); });
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle');
    const menuInitiallyHidden = !(await page.locator('#store-navigation').isVisible());
    const stylesheetApplied = await page.locator('.product-grid').evaluate(grid => getComputedStyle(grid).display === 'grid');
    await page.getByRole('button', { name: 'Отвори мени' }).click();
    await page.waitForFunction(() => document.querySelector('.menu-toggle')?.getAttribute('aria-expanded') === 'true');
    const menuOpened = await page.locator('#store-navigation').isVisible() && await page.getByRole('button', { name: 'Затвори мени' }).getAttribute('aria-expanded') === 'true';
    await page.locator('#store-navigation').getByRole('link', { name: 'Зеленчук', exact: true }).click();
    await page.waitForURL('**/vegetables');
    const vegetableCount = await page.locator('.product-card').count();
    const menuClosed = !(await page.locator('#store-navigation').isVisible());
    await page.locator('.category-filters').getByRole('link', { name: 'Овошје', exact: true }).click();
    await page.waitForURL('**/fruit');
    const fruitCount = await page.locator('.product-card').count();
    const reloads = [];
    for (let attempt = 1; attempt <= 5; attempt++) {
      const started = Date.now();
      const response = await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(250);
      reloads.push({ status: response.status(), duration: Date.now() - started, cards: await page.locator('.product-card').count(), headerVisible: await page.locator('.site-header').isVisible() });
    }
    report.interactions = { stylesheetApplied, menuInitiallyHidden, menuOpened, menuClosed, vegetableCount, fruitCount, reloads, errors, badResponses };
    report.routeChecks = [];
    for (const route of ['/', '/fruit', '/vegetables', '/sale', '/contact', '/admin', '/admin/products', '/admin/products/new', '/admin/products/banana/edit', '/admin/login']) {
      const started = Date.now();
      const response = await page.goto(`${base}${route}`, { waitUntil: 'load' });
      const state = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        header: !!document.querySelector('.site-header, .admin-header, .login-card'),
        productCards: document.querySelectorAll('.product-card').length,
        oversizedPhotos: [...document.querySelectorAll('.product-image img')].filter(image => image.getBoundingClientRect().height > innerHeight / 2).length,
      }));
      report.routeChecks.push({ route, status: response.status(), duration: Date.now() - started, ...state });
    }
    await context.close();
  } finally {
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify({ interactions: report.interactions, report: path.join(output, `${label}.json`) }));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
