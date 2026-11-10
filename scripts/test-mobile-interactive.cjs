const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = 'https://localhost:4173';
const SHOTS = path.resolve('C:/Users/Iwan Kurniawan/.gemini/antigravity/brain/e628cb17-2b23-4e08-a146-48d62ef79dd4/scratch/mobile_audit');

async function testInteractiveMobile() {
  const exe = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].find(fs.existsSync);

  const browser = await puppeteer.launch({
    executablePath: exe,
    headless: 'new',
    args: ['--no-sandbox', '--ignore-certificate-errors', '--allow-insecure-localhost'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

    // 1. Notification Popover on Mobile
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));
    await page.click('button[aria-label="Notifikasi"]');
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: path.join(SHOTS, '18-mobile-notif-popover.png') });
    await page.keyboard.press('Escape');

    // 2. Notes Notepad Window on Mobile
    await page.goto(`${BASE}/productivity/notes`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));
    await page.evaluate(() => {
      const h = Array.from(document.querySelectorAll('h4')).find((el) => el.innerText.includes('Kredensial'));
      if (h) h.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: path.join(SHOTS, '19-mobile-notes-notepad.png') });
    await page.keyboard.press('Escape');

    // 3. RPA Monitoring In-Memory Offline Sample Test on Mobile
    await page.goto(`${BASE}/dev/rpa-monitoring`, { waitUntil: 'networkidle0' });
    await page.setOfflineMode(true);
    await new Promise((r) => setTimeout(r, 400));
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Monitoring.xlsx'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 800));
    const rpaPrioText = await page.evaluate(() => document.body.innerText);
    const hasPrio = rpaPrioText.includes('ROB-065') && !rpaPrioText.includes('ROB-101');
    await page.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Non-Priority Robots'));
      if (tab) tab.click();
    });
    await new Promise((r) => setTimeout(r, 300));
    const rpaNonPrioText = await page.evaluate(() => document.body.innerText);
    const hasNonPrio = rpaNonPrioText.includes('ROB-203');
    console.log('RPA offline sample works on mobile:', { hasPrio, hasNonPrio });
    await page.screenshot({ path: path.join(SHOTS, '20-mobile-rpa-result.png') });
    if (!hasPrio || !hasNonPrio) throw new Error('RPA sample failed on mobile');
  } finally {
    await browser.close();
  }
}

testInteractiveMobile().catch((e) => {
  console.error(e);
  process.exit(1);
});
