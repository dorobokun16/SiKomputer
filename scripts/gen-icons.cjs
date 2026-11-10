const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const exe = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].find(fs.existsSync);

  const browser = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const svg = fs.readFileSync('public/favicon.svg', 'utf8');
  const baseHtml = `<!DOCTYPE html><html><body style="margin:0;padding:0;display:flex;align-items:center;justify-content:center;background:transparent;">
    ${svg.replace('viewBox="0 0 32 32"', 'viewBox="0 0 32 32" style="width:100%;height:100%;"')}
  </body></html>`;

  // 192x192
  await page.setViewport({ width: 192, height: 192, deviceScaleFactor: 1 });
  await page.setContent(baseHtml);
  await page.screenshot({ path: 'public/pwa-192.png', omitBackground: true });

  // 512x512
  await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 1 });
  await page.setContent(baseHtml);
  await page.screenshot({ path: 'public/pwa-512.png', omitBackground: true });

  // Maskable 512x512
  const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="#0B0F17"/>
    <g transform="translate(64, 64) scale(12)">
      <rect width="32" height="32" rx="8" fill="url(#g)"/>
      <path d="M16 6l9 10-9 10-9-10z" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>
      <circle cx="16" cy="16" r="2.4" fill="#fff"/>
    </g>
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#6366F1"/>
        <stop offset="1" stop-color="#22D3EE"/>
      </linearGradient>
    </defs>
  </svg>`;
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;">${maskableSvg}</body></html>`);
  await page.screenshot({ path: 'public/pwa-maskable-512.png' });

  await browser.close();
  console.log('PWA PNG icons generated successfully!');
})();

