const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const exe = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].find(fs.existsSync);

  const browser = await puppeteer.launch({
    executablePath: exe,
    headless: 'new',
    args: ['--no-sandbox', '--ignore-certificate-errors'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });
  await page.goto('https://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1000));

  // Navigasi ke Settings
  await page.evaluate(() => {
    window.location.href = '/settings';
  });
  await new Promise((r) => setTimeout(r, 1000));

  // 1. Cek apakah Service Worker terdaftar
  const swRegistered = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    return !!reg;
  });
  console.log('Service Worker Registered:', swRegistered);

  // 2. Cek manifest link
  const manifestHref = await page.evaluate(() => {
    const link = document.querySelector('link[rel="manifest"]');
    return link ? link.getAttribute('href') : null;
  });
  console.log('Manifest Link:', manifestHref);

  // 3. Navigasi ke Tab PWA di Settings
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await (await b.getProperty('textContent')).jsonValue();
    if (text.includes('PWA & Akses')) {
      await b.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 600));

  // 4. Verifikasi teks di Tab PWA
  const text = await page.evaluate(() => document.body.innerText);
  console.log('Includes PWA Standalone Title:', text.includes('Aplikasi Mandiri (Progressive Web App - PWA'));
  console.log('Includes Offline Cache Status:', text.includes('Offline Cache Aktif (Service Worker sikomputer-offline-v1)'));
  console.log('Includes Laptop Guide:', text.includes('Laptop Lain (Windows / Mac)'));
  console.log('Includes Android Guide:', text.includes('Smartphone Android'));
  console.log('Includes iOS Guide:', text.includes('iPhone / iPad (Safari)'));

  // Screenshot Tab PWA
  const shotPath = 'C:/Users/Iwan Kurniawan/.gemini/antigravity/brain/e628cb17-2b23-4e08-a146-48d62ef79dd4/pwa-settings-tab.png';
  await page.screenshot({ path: shotPath });
  console.log('Screenshot PWA saved to:', shotPath);

  await browser.close();
  console.log('PWA VERIFIKASI SELESAI!');
})();

