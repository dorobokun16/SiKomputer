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
  await page.goto('https://localhost:5173/dev/rpa-monitoring', { waitUntil: 'networkidle0' });

  const inp = await page.$('input[type="file"]');
  await inp.uploadFile(path.resolve('public/Monitoring.xlsx'));
  await page.waitForFunction(() => document.body.innerText.includes('Kolom Tersembunyi'));

  const text = await page.evaluate(() => document.body.innerText);
  console.log('Includes Hidden Columns Header:', text.includes('9 Kolom Tersembunyi (Hidden Columns) Berhasil Dibaca Lengkap'));
  console.log('Includes Badge:', text.includes('9 Kolom Tersembunyi Terbaca'));

  const artifactPath = 'C:/Users/Iwan Kurniawan/.gemini/antigravity/brain/e628cb17-2b23-4e08-a146-48d62ef79dd4/rpa-monitoring-hidden-columns.png';
  await page.screenshot({ path: artifactPath });
  console.log('Screenshot saved to:', artifactPath);

  await browser.close();
})();
