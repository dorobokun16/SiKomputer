const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'https://localhost:5173';
const SHOTS = process.argv[2] || path.join(__dirname, '..');

async function testRpaMonitoring() {
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

    console.log('Navigasi ke /dev/rpa-monitoring...');
    await page.goto(`${BASE}/dev/rpa-monitoring`, { waitUntil: 'networkidle0' });

    // 1. Upload berkas sample public/Monitoring.xlsx
    console.log('Mengunggah berkas sample public/Monitoring.xlsx...');
    const fileInput = await page.$('input[type=file]');
    const excelPath = path.resolve('public/Monitoring.xlsx');
    await fileInput.uploadFile(excelPath);

    // Tunggu hasil parsing
    await page.waitForFunction(() => document.body.innerText.includes('Format Chat: Status Robot Priority'), {
      timeout: 10000,
    });
    await new Promise((r) => setTimeout(r, 800));

    // Cek teks Priority
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasPrioTitle = bodyText.includes('Update monitoring robot PA status :');
    const hasRob065 = bodyText.includes('ROB-065');
    const hasRob206 = bodyText.includes('ROB-206');
    const hasRob269 = bodyText.includes('ROB-269');
    console.log('Priority Checks:', { hasPrioTitle, hasRob065, hasRob206, hasRob269 });

    // Screenshot Tab Priority
    await page.screenshot({ path: path.join(SHOTS, 'rpa-monitoring-priority.png') });
    console.log('PASS: Screenshot Tab Priority tersimpan');

    // 2. Klik Tab Non-Priority
    const tabs = await page.$$('button');
    for (const b of tabs) {
      const text = await (await b.getProperty('textContent')).jsonValue();
      if (text.includes('Non-Priority Robots')) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 600));

    // Cek teks Non-Priority
    const nonPrioBodyText = await page.evaluate(() => document.body.innerText);
    const hasNonPrioTitle = nonPrioBodyText.includes('Update Monitoring robot Non Prior PA Status :');
    const hasRob203 = nonPrioBodyText.includes('ROB-203');
    console.log('Non-Priority Checks:', { hasNonPrioTitle, hasRob203 });

    // Screenshot Tab Non-Priority
    await page.screenshot({ path: path.join(SHOTS, 'rpa-monitoring-non-priority.png') });
    console.log('PASS: Screenshot Tab Non-Priority tersimpan');

    // 3. Tes Tombol Salin Format Chat
    for (const b of await page.$$('button')) {
      const text = await (await b.getProperty('textContent')).jsonValue();
      if (text.includes('Salin Format Chat')) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 400));

    if (errors.length > 0) {
      console.error('JS Errors:', errors);
      process.exit(1);
    }

    if (!hasPrioTitle || !hasRob065 || !hasRob206 || !hasNonPrioTitle || !hasRob203) {
      console.error('Format teks tidak lengkap sesuai kriteria!');
      process.exit(1);
    }

    console.log('PENGUJIAN RPA MONITORING SUKSES 100%!');
  } finally {
    await browser.close();
  }
}

testRpaMonitoring().catch((err) => {
  console.error('Error saat tes:', err);
  process.exit(1);
});

