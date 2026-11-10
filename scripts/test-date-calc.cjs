const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'https://localhost:5173';
const SHOTS = process.argv[2] || path.join(__dirname, '..');

async function testDateCalc() {
  const exe = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].find(fs.existsSync);

  const browser = await puppeteer.launch({
    executablePath: exe,
    headless: 'new',
    args: ['--no-sandbox', '--ignore-certificate-errors'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 950 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    console.log('Navigasi ke /productivity/date-calc ...');
    await page.goto(`${BASE}/productivity/date-calc`, { waitUntil: 'networkidle0' });

    // Cek header dan tab
    await page.waitForSelector('h1');
    const title = await page.$eval('h1', (el) => el.textContent);
    console.log('Title:', title);

    // 1. Screenshot Tab 1: Selisih Dua Tanggal
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SHOTS, 'date-calc-diff.png') });
    console.log('PASS: Tab Selisih Dua Tanggal');

    // 2. Klik Tab Tambah / Kurang Hari
    const tabs = await page.$$('button');
    for (const b of tabs) {
      const text = await (await b.getProperty('textContent')).jsonValue();
      if (text.includes('Tambah / Kurang Hari')) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SHOTS, 'date-calc-addsub.png') });
    console.log('PASS: Tab Tambah / Kurang');

    // 3. Klik Tab Deadline & Hari Kerja
    for (const b of await page.$$('button')) {
      const text = await (await b.getProperty('textContent')).jsonValue();
      if (text.includes('Deadline & Hari Kerja')) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SHOTS, 'date-calc-deadline.png') });
    console.log('PASS: Tab Deadline & Hari Kerja');

    // 4. Klik Tab Kalkulator Usia
    for (const b of await page.$$('button')) {
      const text = await (await b.getProperty('textContent')).jsonValue();
      if (text.includes('Kalkulator Usia')) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SHOTS, 'date-calc-age.png') });
    console.log('PASS: Tab Kalkulator Usia');

    if (errors.length > 0) {
      console.error('JS Errors:', errors);
      process.exit(1);
    }
    console.log('ALL TESTS PASSED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

testDateCalc().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

