import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Explicitly local, synthetic fixture only. This never calls merchant sites,
// production jobs, payment services or Firecrawl.
const origin = new URL(process.env.DEMO_ORIGIN || 'http://localhost:3177');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname));
const modulePath = process.env.PLAYWRIGHT_MODULE;
assert.ok(modulePath, 'Set PLAYWRIGHT_MODULE to the existing test runtime.');
const { chromium } = await import(pathToFileURL(modulePath).href);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium', headless: true });
const output = path.resolve('public/demo-evidence');
await mkdir(output, { recursive: true });
const checks = [];
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
    const context = await browser.newContext({ viewport });
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      return url.origin === origin.origin ? route.continue() : route.abort();
    });
    for (const mode of ['before', 'after']) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const response = await page.goto(new URL(`/demo/${mode}`, origin).href);
      assert.equal(response.status(), 200);
      await page.getByRole('button', { name: 'Navy', exact: true }).click();
      await page.getByTestId('add-to-cart').click();
      await page.getByTestId('cart-variant').waitFor();
      const observed = {
        viewport, mode,
        selected: await page.getByTestId('selected-variant').innerText(),
        cart: await page.getByTestId('cart-variant').innerText(),
        shipping: await page.getByTestId('cart-shipping').innerText(),
        total: await page.getByTestId('cart-total').innerText(),
      };
      assert.equal(observed.selected, 'Selected: Navy');
      assert.equal(observed.cart, mode === 'before' ? 'Colour: Natural' : 'Colour: Navy');
      assert.equal(observed.shipping, mode === 'before' ? '£6' : '£0');
      assert.equal(observed.total, mode === 'before' ? '£75' : '£69');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');
      await page.screenshot({ path: path.join(output, `${mode}-${viewport.width === 390 ? 'mobile' : 'desktop'}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Clear demo cart', exact: true }).click();
      await page.getByRole('button', { name: 'Natural', exact: true }).click();
      await page.getByTestId('add-to-cart').click();
      assert.equal(await page.getByTestId('cart-variant').innerText(), 'Colour: Natural');
      const guideUrl = new URL(await page.getByTestId('size-guide').getAttribute('href'), origin);
      // Real HTTP status is captured via navigation, not inferred from the text.
      const guide = await page.goto(guideUrl.href);
      observed.guideStatus = guide.status();
      assert.equal(guide.status(), mode === 'before' ? 404 : 200);
      if (mode === 'after') {
        assert.match(await page.locator('main').innerText(), /36 cm wide/);
        await page.getByRole('link', { name: 'Return to corrected test product' }).click();
        await page.getByTestId('add-to-cart').waitFor();
        await page.goto(guideUrl.href);
      }
      if (viewport.width === 390) await page.screenshot({ path: path.join(output, `${mode}-guide.png`), fullPage: true });
      assert.deepEqual(errors, [], 'No client exceptions');
      checks.push(observed);
      await page.close();
    }
    await context.close();
  }
  const sourceHashes = {};
  for (const file of ['components/demo-storefront.tsx', 'app/demo/[version]/page.tsx', 'app/demo/[version]/size-guide/page.tsx']) {
    sourceHashes[file] = createHash('sha256').update(await readFile(file)).digest('hex');
  }
  const result = { verified: true, checkedAt: new Date().toISOString(), context: 'Real Chromium checks on a local controlled Storefront HQ fixture, not merchant results. No payment or live checkout.', browser: browser.version(), checks, sourceHashes };
  await writeFile(path.join(output, 'verification.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
