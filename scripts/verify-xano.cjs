// Browser contract tests intercept API traffic: they never create or delete live Xano records.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))); }

const app = process.argv[2] || 'http://localhost:3100';
const origin = 'https://x8ki-letl-twmt.n7.xano.io';
const productsBase = `${origin}/api:B2FDnMho`;
const authBase = `${origin}/api:EOaIUs6k`;
const token = 'contract-test-token';
const report = { checks: [], browserErrors: [], liveWrites: 0 };
function passed(check) { report.checks.push(check); console.log(`PASS ${check}`); }

async function main() {
  await fs.mkdir('reports/branding', { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const imageBytes = await fs.readFile(path.join(process.cwd(), 'public/brand/banana-makovo-logo.webp'));
  const attachment = { access: 'public', path: '/vault/contract-test/product.webp', name: 'product.webp', type: 'image', size: imageBytes.length, mime: 'image/webp', meta: { width: 424, height: 265 }, url: `${origin}/vault/contract-test/product.webp` };
  try {
    // This separate context permits only read requests to the actual API.
    const live = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await live.route(`${origin}/**`, route => {
      if (route.request().method() === 'GET' || route.request().method() === 'OPTIONS') return route.continue();
      report.liveWrites++; return route.abort();
    });
    const livePage = await live.newPage();
    const liveResponse = livePage.waitForResponse(response => response.url().startsWith(`${productsBase}/products?`));
    await livePage.goto(app);
    const actual = await liveResponse;
    assert.equal(actual.status(), 200);
    const actualBody = await actual.json();
    assert.ok(Array.isArray(actualBody.items));
    await livePage.waitForFunction(() => document.querySelector('[aria-busy]')?.getAttribute('aria-busy') === 'false');
    assert.equal(await livePage.locator('.fixture-note').count(), 0);
    report.liveCatalogItems = actualBody.itemsTotal ?? actualBody.items.length;
    passed('Live public catalog loads in mobile Chrome with CORS; no fixture fallback');
    await live.close();

    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    let records = [
      { id: 1, name: 'Тест банана', price: 80, category: 'Fruits', unit: 'kg', is_available: true, is_on_sale: false, sale_price: null, sort_order: 1, image: attachment },
      { id: 2, name: 'Тест домат', price: 70, category: 'Vegetables', unit: 'package', is_available: false, is_on_sale: true, sale_price: 50, sort_order: 2, image: null },
    ];
    let role = 'admin', loginFailure = false, uploadFailure = false, createFailures = 0, toggleFailure = false, deleteFailure = false, unauthorized = false;
    let uploads = 0, creates = 0, uploadRequests = [], writes = [], requestedPages = new Set();
    await context.route(`${origin}/**`, async route => {
      const request = route.request(), url = new URL(request.url()), method = request.method();
      const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname.startsWith('/vault/contract-test/')) return route.fulfill({ contentType: 'image/webp', body: imageBytes });
      if (`${url.origin}${url.pathname}` === `${authBase}/auth/login`) {
        assert.equal(method, 'POST');
        assert.equal(request.postDataJSON().email, 'contract@example.test');
        return loginFailure ? json({ message: 'Invalid credentials' }, 401) : json({ authToken: token, user_id: 42 });
      }
      if (`${url.origin}${url.pathname}` === `${authBase}/auth/me`) {
        assert.equal(request.headers().authorization, `Bearer ${token}`);
        return json({ id: 42, name: 'Contract Admin', email: 'contract@example.test', role });
      }
      if (url.pathname.startsWith('/api:B2FDnMho/admin/')) {
        assert.equal(request.headers().authorization, `Bearer ${token}`);
        if (unauthorized) return json({ message: 'Session expired' }, 401);
      }
      if (url.pathname === '/api:B2FDnMho/products' && method === 'GET') {
        const page = Number(url.searchParams.get('page') || 1); requestedPages.add(page);
        const filtered = url.searchParams.get('sale') === 'true' ? records.filter(record => record.is_on_sale) : records;
        // Small response pages exercise following the documented nextPage field.
        return json({ itemsReceived: filtered.slice(page - 1, page).length, curPage: page, nextPage: page < filtered.length ? page + 1 : null, prevPage: page > 1 ? page - 1 : null, offset: page - 1, perPage: 1, items: filtered.slice(page - 1, page), itemsTotal: filtered.length });
      }
      if (url.pathname.startsWith('/api:B2FDnMho/products/') && method === 'GET') {
        const record = records.find(record => record.id === Number(url.pathname.split('/').at(-1)));
        return record ? json(record) : json({ message: 'Product not found' }, 404);
      }
      if (url.pathname === '/api:B2FDnMho/admin/uploads/product-image' && method === 'POST') {
        uploads++;
        assert.match(request.headers()['content-type'], /^multipart\/form-data; boundary=/);
        const bytes = request.postDataBuffer();
        assert.ok(bytes.includes(Buffer.from('name="file"')));
        assert.ok(bytes.includes(imageBytes));
        uploadRequests.push({ field: 'file', bytes: imageBytes.length, boundary: true });
        if (uploadFailure) return json({ message: 'Upload rejected' }, 422);
        writes.push('upload'); return json(attachment);
      }
      if (url.pathname === '/api:B2FDnMho/admin/products' && method === 'POST') {
        creates++; const payload = request.postDataJSON(); writes.push('create');
        if (createFailures > 0) { createFailures--; return json({ message: 'Save failed' }, 500); }
        assert.equal(payload.unit, 'kg'); assert.equal(payload.image.path, attachment.path);
        assert.equal(payload.image.meta.width, 424); assert.equal(payload.is_available, true);
        assert.equal(payload.category, 'fruit');
        const created = { id: 3, ...payload }; records.push(created); return json(created);
      }
      if (url.pathname.startsWith('/api:B2FDnMho/admin/products/')) {
        const id = Number(url.pathname.split('/').at(-1)); const existing = records.find(record => record.id === id);
        if (!existing) return json({ message: 'Product not found' }, 404);
        if (method === 'PATCH') {
          const payload = request.postDataJSON();
          if (toggleFailure && Object.keys(payload).length === 1) return json({ message: 'Availability update failed' }, 500);
          writes.push({ patch: payload });
          Object.assign(existing, payload); if (payload.remove_image) existing.image = null;
          return json(existing);
        }
        if (method === 'DELETE') {
          if (deleteFailure) return json({ message: 'Delete failed' }, 500);
          records = records.filter(record => record.id !== id); writes.push('delete'); return json({ success: true, message: 'Product deleted successfully' });
        }
      }
      throw new Error(`Undocumented/unhandled API request: ${method} ${url.pathname}`);
    });

    const page = await context.newPage();
    page.on('pageerror', error => report.browserErrors.push(error.message));
    await page.goto(`${app}/admin/products/new`);
    await page.waitForURL('**/admin/login?next=**');
    assert.equal(await page.locator('input[type=file]').count(), 0);
    passed('Unauthenticated admin routes redirect to login');
    async function login() {
      await page.getByLabel('Е-пошта', { exact: true }).fill('contract@example.test');
      await page.getByLabel('Лозинка', { exact: true }).fill('test-password');
      await page.getByRole('button', { name: 'Најави се', exact: true }).click();
    }
    loginFailure = true; await login();
    await page.getByRole('alert').filter({ hasText: 'Invalid credentials' }).waitFor();
    assert.equal(await page.evaluate(() => sessionStorage.getItem('banana-makovo-admin-token')), null);
    passed('Invalid credentials show an error without creating a browser session');
    loginFailure = false; role = 'member'; await login();
    await page.getByRole('alert').filter({ hasText: 'нема администраторски пристап' }).waitFor();
    assert.equal(await page.evaluate(() => sessionStorage.getItem('banana-makovo-admin-token')), null);
    passed('Member role is rejected before any product upload or write');
    role = 'admin'; await login();
    await page.waitForURL('**/admin/products/new');
    await page.getByLabel('Фотографија на производот', { exact: true }).waitFor();
    assert.equal(await page.locator('input[type=url]').count(), 0);
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByLabel('Фотографија на производот', { exact: true }).waitFor();
    passed('Admin login verifies /auth/me and survives reload; no image URL field');
    const fileInput = page.getByLabel('Фотографија на производот', { exact: true });
    await fileInput.setInputFiles({ name: 'invalid.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
    await page.getByRole('alert').filter({ hasText: 'JPEG, PNG или WebP' }).waitFor();
    await fileInput.setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(5_242_881) });
    await page.getByRole('alert').filter({ hasText: 'поголема од 5 MB' }).waitFor();
    assert.equal(uploads, 0);
    passed('Invalid MIME type and files above 5 MB are rejected before uploading');
    await fileInput.setInputFiles({ name: 'product.webp', mimeType: 'image/webp', buffer: imageBytes });
    await page.waitForFunction(() => document.querySelector('.upload-preview img')?.src.startsWith('blob:'));
    await page.setViewportSize({ width: 320, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: 'reports/branding/xano-image-upload-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel('Име на производ *', { exact: true }).fill('Нова фотографија тест');
    await page.getByLabel('Цена (ден) *', { exact: true }).fill('90');
    uploadFailure = true;
    await page.getByRole('button', { name: 'Додај производ', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Upload rejected' }).waitFor();
    assert.equal(creates, 0);
    passed('Failed upload prevents product creation and shows the server error');
    uploadFailure = false; createFailures = 1;
    await page.getByRole('button', { name: 'Додај производ', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'производот не е зачуван' }).waitFor();
    const uploadsBeforeRetry = uploads;
    await page.getByRole('button', { name: 'Додај производ', exact: true }).click();
    await page.waitForURL('**/admin/products');
    await page.getByText('Нова фотографија тест', { exact: true }).waitFor();
    assert.equal(uploads, uploadsBeforeRetry);
    assert.deepEqual(writes.slice(0, 3), ['upload', 'create', 'create']);
    assert.equal(records.at(-1).image.path, attachment.path);
    passed('Multipart file upload precedes JSON save; retry reuses uploaded attachment');
    assert.ok(requestedPages.has(2));
    assert.match(await page.locator('tr').filter({ hasText: 'Тест домат' }).innerText(), /ден\/пакување/);
    await page.screenshot({ path: 'reports/branding/xano-admin-products.png', fullPage: true });
    passed('Catalog pagination follows nextPage and maps API units/categories');

    await page.getByRole('link', { name: 'Уреди Нова фотографија тест', exact: true }).click();
    await page.getByLabel('Цена (ден) *', { exact: true }).fill('100');
    await page.getByRole('button', { name: 'Зачувај промени', exact: true }).click();
    await page.waitForURL('**/admin/products');
    const pricePatch = writes.filter(write => write.patch).at(-1).patch;
    assert.equal(pricePatch.price, 100); assert.equal(Object.hasOwn(pricePatch, 'image'), false); assert.equal(Object.hasOwn(pricePatch, 'remove_image'), false);
    passed('Editing price omits image fields and preserves the current photograph');
    await page.getByRole('link', { name: 'Уреди Нова фотографија тест', exact: true }).click();
    await page.getByRole('button', { name: 'Отстрани фотографија', exact: true }).click();
    await page.getByRole('button', { name: 'Зачувај промени', exact: true }).click();
    await page.waitForURL('**/admin/products');
    assert.equal(records.find(record => record.id === 3).image, null);
    assert.equal(writes.filter(write => write.patch).at(-1).patch.remove_image, true);
    passed('Removing an existing photo sends the documented remove_image flag');

    toggleFailure = true;
    await page.getByRole('button', { name: 'Означи дека нема на залиха: Нова фотографија тест', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Availability update failed' }).waitFor();
    assert.equal(records.find(record => record.id === 3).is_available, true);
    assert.equal(await page.getByRole('button', { name: 'Означи дека нема на залиха: Нова фотографија тест', exact: true }).getAttribute('aria-pressed'), 'true');
    passed('Failed availability update keeps the previous state');
    toggleFailure = false;
    await page.getByRole('button', { name: 'Означи дека нема на залиха: Нова фотографија тест', exact: true }).click();
    await page.getByRole('button', { name: 'Означи како достапен: Нова фотографија тест', exact: true }).waitFor();
    assert.deepEqual(writes.filter(write => write.patch).at(-1).patch, { is_available: false });
    passed('Availability uses PATCH /admin/products/{id}, not an invented endpoint');

    const storefront = await context.newPage();
    await storefront.goto(app, { waitUntil: 'networkidle' });
    await storefront.getByRole('heading', { name: 'Нова фотографија тест', exact: true }).waitFor();
    assert.equal(await storefront.locator('.product-card').count(), 3);
    deleteFailure = true; page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Избриши Нова фотографија тест', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Delete failed' }).waitFor();
    assert.ok(records.find(record => record.id === 3));
    passed('Failed deletion keeps the product visible');
    deleteFailure = false; page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Избриши Нова фотографија тест', exact: true }).click();
    await page.waitForFunction(() => ![...document.querySelectorAll('.table-product strong')].some(element => element.textContent === 'Нова фотографија тест'));
    await storefront.waitForFunction(() => ![...document.querySelectorAll('.product-card h3')].some(element => element.textContent === 'Нова фотографија тест'));
    passed('Successful deletion updates admin and the open storefront across tabs');
    unauthorized = true;
    await page.getByRole('button', { name: 'Означи дека нема на залиха: Тест банана', exact: true }).click();
    await page.waitForURL('**/admin/login**');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('banana-makovo-admin-token')), null);
    passed('Unauthorized writes clear the expired session and return to login');
    assert.equal(report.browserErrors.length, 0); assert.equal(report.liveWrites, 0);
    report.multipartRequests = uploadRequests;
    await context.close();
  } finally {
    await fs.mkdir('reports', { recursive: true });
    await fs.writeFile('reports/xano-integration.json', JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify({ checks: report.checks.length, browserErrors: report.browserErrors, liveWrites: report.liveWrites }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
