const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { chromium } = require(path.join(process.env.TEMP, 'repxl-payment-browser/node_modules/playwright'));
const prisma = new PrismaClient();
const base = 'http://localhost:3000';
const artifactDir = path.join(process.env.TEMP, 'repxl-payment-browser');
let user, product, browser;
let failures = 0;

async function main() {
  assert.match(process.env.PAYMONGO_SECRET_KEY || '', /^sk_test_/);
  const marker = randomUUID();
  const email = `payment-${marker}@repxl.invalid`;
  const password = randomUUID();
  try {
    user = await prisma.user.create({ data: {
      email, password: await bcrypt.hash(password, 10), firstName: 'Sandbox', lastName: 'Payment',
      addresses: { create: { fullName: 'Sandbox Payment', address: '123 Test Street',
        barangay: 'Ermita', city: 'Manila', province: 'Metro Manila', postalCode: '1000',
        phone: '09171234567', isDefault: true } },
    } });
    product = await prisma.product.create({ data: {
      slug: `sandbox-${marker}`, name: 'RePXL Sandbox Camera', brand: 'Canon', series: 'Sandbox',
      price: 100, condition: 'GOOD', image: '/images/product-sony-w800.svg', stock: 10,
      status: 'INACTIVE', description: 'Temporary private payment test fixture', megapixels: 10,
      zoom: '3x', storage: 'SD', year: 2008,
    } });
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const login = await context.request.post(`${base}/api/auth/login`, { data: { email, password } });
    assert.equal(login.status(), 200, 'Test customer login failed');
    assert.equal((await login.json()).success, true);
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    // Keep the fixture hidden from the public catalogue. Only this browser's
    // catalogue response includes it; all payment, auth, order and DB calls are real.
    await page.route('**/api/products?**', async route => {
      const response = await route.fetch();
      const json = await response.json();
      if (Array.isArray(json.data)) json.data.unshift(product);
      await route.fulfill({ response, json });
    });

    async function review(number) {
      await prisma.cartItem.upsert({ where: { userId_productId: { userId: user.id, productId: product.id } },
        create: { userId: user.id, productId: product.id, quantity: 1 }, update: { quantity: 1 } });
      await page.goto(`${base}/checkout`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForFunction(() => document.body.innerText.includes('RePXL Sandbox Camera'), { timeout: 60000 });
      await page.getByRole('button', { name: /Continue to Shipping/ }).click();
      await page.getByRole('button', { name: /Continue to Payment/ }).click();
      await page.locator('#card-number').fill(number);
      await page.locator('#card-expiry').fill('12/29');
      await page.locator('#card-cvc').fill('123');
      await page.locator('#agree-terms').click();
      await page.getByRole('dialog').evaluate(el => {
        for (const child of el.querySelectorAll('*')) {
          if (child.scrollHeight > child.clientHeight + 30) {
            child.scrollTop = child.scrollHeight;
            child.dispatchEvent(new Event('scroll', { bubbles: true }));
          }
        }
      });
      await page.getByRole('button', { name: 'I Agree', exact: true }).click();
      await page.getByRole('button', { name: /Review Order/ }).click();
      const responsePromise = page.waitForResponse(r => r.url().endsWith('/api/checkout/process-payment') && r.request().method() === 'POST', { timeout: 90000 });
      await page.getByRole('button', { name: /Place Order/ }).click();
      const response = await responsePromise;
      return { status: response.status(), body: await response.json() };
    }

    async function test(name, fn) {
      if (process.env.PAYMONGO_BROWSER_ONLY && !new RegExp(process.env.PAYMONGO_BROWSER_ONLY).test(name)) return;
      try { await fn(); console.log(JSON.stringify({ name, result: 'PASS' })); }
      catch (e) {
        failures++;
        console.log(JSON.stringify({ name, result: 'FAIL', detail: String(e.message).slice(0, 650) }));
        await page.screenshot({ path: path.join(artifactDir, `${name.replace(/\W/g, '-')}-failure.png`), fullPage: true }).catch(() => {});
      }
    }

    async function paidAssertions(orderNumber, beforeStock) {
      await page.waitForURL(/\/checkout\/success/, { timeout: 90000 });
      await page.getByRole('heading', { name: 'Payment Successful', exact: true }).waitFor({ timeout: 90000 });
      const order = await prisma.order.findUniqueOrThrow({ where: { orderNumber } });
      assert.equal(order.paymentStatus, 'PAID');
      assert.match(order.paymentReference, /^pay_/);
      assert.equal(order.total, 106);
      assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, beforeStock - 1);
      assert.equal(await prisma.cartItem.count({ where: { userId: user.id } }), 0);
      const notifications = await prisma.notification.count({ where: { userId: user.id } });
      for (let i = 0; i < 2; i++) {
        const verify = await context.request.post(`${base}/api/checkout/verify`, { data: { orderNumber } });
        assert.equal(verify.status(), 200);
        assert.equal((await verify.json()).data.paymentStatus, 'PAID');
      }
      assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, beforeStock - 1);
      assert.equal(await prisma.notification.count({ where: { userId: user.id } }), notifications);
      await page.screenshot({ path: path.join(artifactDir, 'payment-success.png'), fullPage: true });
    }

    await test('Browser Visa capture and idempotent verification', async () => {
      const stock = (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock;
      const { status, body } = await review('4343434343434345');
      assert.equal(status, 200);
      assert.equal(body.data.isPaid, true);
      await paidAssertions(body.data.orderNumber, stock);
    });
    for (const [name, card, expected] of [
      ['Browser expired-card decline', '4200000000000018', /expired/i],
      ['Browser CVC decline', '4300000000000017', /CVC/i],
      ['Browser insufficient-funds decline', '5100000000000198', /insufficient funds/i],
    ]) {
      await test(name, async () => {
        const stock = (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock;
        const { status, body } = await review(card);
        assert.equal(status, 400);
        assert.match(body.error, expected);
        await page.getByRole('alert').filter({ hasText: expected }).waitFor();
        const order = await prisma.order.findFirstOrThrow({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
        assert.equal(order.paymentStatus, 'FAILED');
        assert.equal(order.status, 'CANCELLED');
        assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, stock);
        assert.equal(await prisma.cartItem.count({ where: { userId: user.id } }), 1);
        assert.doesNotMatch(await page.getByRole('alert').allTextContents().then(a => a.join(' ')), /details\.|Prisma|stack|HTTP \d|payment_intent/i);
        await page.screenshot({ path: path.join(artifactDir, `${name.replace(/\W/g, '-')}.png`), fullPage: true });
      });
    }
    await test('Browser Visa 3DS authorization and verification', async () => {
      const stock = (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock;
      const { status, body } = await review('4120000000000007');
      assert.equal(status, 200);
      assert.equal(body.data.status, 'AWAITING_NEXT_ACTION');
      assert.equal(body.data.isPaid, false);
      await page.waitForURL(url => url.hostname.endsWith('.paymongo.com'), { timeout: 45000 });
      await page.waitForLoadState('domcontentloaded');
      console.log('3DS buttons: '+JSON.stringify(await page.getByRole('button').allTextContents()));
      console.log('3DS page text: '+(await page.locator('body').innerText()).slice(0, 1800));
      await page.screenshot({ path: path.join(artifactDir, '3ds-prompt.png'), fullPage: true });
      await page.getByRole('button', { name: /Authorize|Complete|Success|Authenticate|Pass/i }).first().click();
      await paidAssertions(body.data.orderNumber, stock);
    });
    console.log(JSON.stringify({ failures, artifacts: artifactDir }));
    if (failures) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (user) await prisma.user.delete({ where: { id: user.id } });
    if (product) await prisma.product.delete({ where: { id: product.id } });
    console.log('Temporary customer, address, cart, orders, notifications and private product removed.');
    await prisma.$disconnect();
  }
}
main().catch(e => { console.error(e.name+': '+String(e.message).slice(0, 800)); process.exitCode = 1; });
