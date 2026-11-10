const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'https://localhost:4173';
const SHOTS = path.resolve('C:/Users/Iwan Kurniawan/.gemini/antigravity/brain/e628cb17-2b23-4e08-a146-48d62ef79dd4');

async function testUpdateUi() {
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
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      if (url.startsWith('https://api.github.com/repos/dorobokun16/SiKomputer/releases/latest')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            tag_name: 'v1.2.0',
            html_url: 'https://github.com/dorobokun16/SiKomputer/releases/tag/v1.2.0',
            published_at: '2026-11-10T10:00:00Z',
            body: '- Simulasi rilis baru v1.2.0\n- Peningkatan performa offline',
            assets: [
              { name: 'SiKomputer.apk', browser_download_url: 'https://github.com/dorobokun16/SiKomputer/releases/download/v1.2.0/SiKomputer.apk' },
              { name: 'SiKomputer.exe', browser_download_url: 'https://github.com/dorobokun16/SiKomputer/releases/download/v1.2.0/SiKomputer.exe' },
              { name: 'SiKomputer-macOS.zip', browser_download_url: 'https://github.com/dorobokun16/SiKomputer/releases/download/v1.2.0/SiKomputer-macOS.zip' },
              { name: 'SiKomputer-web-dist.zip', browser_download_url: 'https://github.com/dorobokun16/SiKomputer/releases/download/v1.2.0/SiKomputer-web-dist.zip' },
            ],
          }),
        });
        return;
      }
      if (url.includes('dorobokun16.github.io') || url.includes('raw.githubusercontent.com')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            version: '1.2.0',
            versionCode: 3,
            releasePageUrl: 'https://github.com/dorobokun16/SiKomputer/releases/tag/v1.2.0',
            notes: ['Simulasi rilis baru v1.2.0', 'Peningkatan performa offline'],
          }),
        });
        return;
      }
      req.continue();
    });

    await page.goto(`${BASE}/settings?tab=pwa`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));

    // Klik Cek Pembaruan
    const t0 = Date.now();
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Cek Pembaruan'));
      if (btn) btn.click();
    });
    await page.waitForFunction(
      () => !document.body.innerText.includes('Mengecek GitHub...'),
      { timeout: 6000 }
    );
    console.log('Check finished in ms:', Date.now() - t0);
    await new Promise((r) => setTimeout(r, 200));

    const checks = await page.evaluate(() => {
      const txt = document.body.innerText;
      const sw = document.documentElement.scrollWidth;
      const vw = window.innerWidth;
      const updateBtn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Update ke v1.2.0'));
      return {
        sw,
        vw,
        hasVersionBadge: txt.includes('v1.1.0 (build #2)'),
        hasRepoSlug: txt.includes('dorobokun16/SiKomputer'),
        hasNewVersionAlert: txt.includes('Versi baru v1.2.0 tersedia di GitHub'),
        hasUpdateActionButton: !!updateBtn,
      };
    });

    await page.screenshot({ path: path.join(SHOTS, 'verify-mobile-github-update.png') });
    console.log('Mobile Update UI checks:', JSON.stringify(checks, null, 2));

    if (!checks.hasVersionBadge || !checks.hasRepoSlug || !checks.hasNewVersionAlert || !checks.hasUpdateActionButton || checks.sw > checks.vw) {
      throw new Error('Update UI assertion failed: ' + JSON.stringify(checks));
    }
    if (errors.length > 0) {
      throw new Error('Page errors: ' + errors.join('; '));
    }
    console.log('PASSED: GitHub Auto-Update UI & mobile responsiveness verified!');
  } finally {
    await browser.close();
  }
}

testUpdateUi().catch((err) => {
  console.error(err);
  process.exit(1);
});
