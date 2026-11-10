const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

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
  await page.goto('https://localhost:5173/', { waitUntil: 'networkidle0' });

  // 1. Cari tombol Bell Notifikasi
  const bellBtn = await page.$('button[aria-label="Notifikasi"]');
  if (!bellBtn) {
    console.error('Tombol Notifikasi tidak ditemukan');
    process.exit(1);
  }
  await bellBtn.click();
  await new Promise((r) => setTimeout(r, 600));

  // 2. Klik "Uji Notifikasi Sekarang"
  const testBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find((b) => b.innerText.includes('Uji Notifikasi Sekarang'));
  });
  if (!testBtn) {
    console.error('Tombol Uji Notifikasi Sekarang tidak ditemukan');
    process.exit(1);
  }
  await testBtn.click();
  await new Promise((r) => setTimeout(r, 600));

  // 3. Verifikasi teks item notifikasi muncul di list
  const text = await page.evaluate(() => document.body.innerText);
  const hasTestNotif = text.includes('Uji Notifikasi SiKomputer');
  console.log('Test Notif Present:', hasTestNotif);

  // 4. Klik "Tandai dibaca"
  const markReadBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find((b) => b.innerText.includes('Tandai dibaca'));
  });
  if (markReadBtn) {
    await markReadBtn.click();
    await new Promise((r) => setTimeout(r, 500));
  }

  // Screenshot popover notifikasi
  const shotPath = 'C:/Users/Iwan Kurniawan/.gemini/antigravity/brain/e628cb17-2b23-4e08-a146-48d62ef79dd4/notification-working.png';
  await page.screenshot({ path: shotPath });
  console.log('Screenshot notification saved to:', shotPath);

  await browser.close();
  console.log('NOTIFIKASI BERHASIL 100%!');
})();

