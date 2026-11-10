const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'https://localhost:4173';
const ARTIFACT_DIR = path.resolve('C:/Users/Iwan Kurniawan/.gemini/antigravity/brain/e628cb17-2b23-4e08-a146-48d62ef79dd4');

async function testApkDownloadUi() {
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
    await page.setViewport({ width: 1440, height: 950 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));

    // Klik tab PWA & Akses Multi-Device
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const pwaBtn = btns.find((b) => b.innerText.includes('PWA & Akses Multi-Device'));
      if (pwaBtn) pwaBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const checks = await page.evaluate(async () => {
      const apkLink = document.querySelector('a[href="/downloads/SiKomputer.apk"]');
      const exeLink = document.querySelector('a[href="/downloads/SiKomputer.exe"]');
      const macLink = document.querySelector('a[href="/downloads/SiKomputer-macOS.zip"]');

      const rApk = await fetch('/downloads/SiKomputer.apk', { method: 'HEAD' });
      const rExe = await fetch('/downloads/SiKomputer.exe', { method: 'HEAD' });
      const rMac = await fetch('/downloads/SiKomputer-macOS.zip', { method: 'HEAD' });

      return {
        hasApkButton: !!apkLink,
        apkButtonText: apkLink ? apkLink.innerText.trim() : null,
        hasExeButton: !!exeLink,
        hasMacButton: !!macLink,
        apkStatus: rApk.status,
        apkBytes: rApk.headers.get('content-length'),
        exeStatus: rExe.status,
        exeBytes: rExe.headers.get('content-length'),
        macStatus: rMac.status,
        macBytes: rMac.headers.get('content-length'),
      };
    });

    console.log('UI & Download checks:', JSON.stringify(checks, null, 2));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify-settings-downloads-apk.png') });

    if (!checks.hasApkButton || checks.apkStatus !== 200 || checks.exeStatus !== 200 || checks.macStatus !== 200) {
      throw new Error('APK / EXE / MAC download UI or endpoint failed!');
    }
    if (errors.length > 0) {
      throw new Error('Page errors: ' + errors.join('; '));
    }
    console.log('PASSED: Settings download card & .apk endpoint verified!');
  } finally {
    await browser.close();
  }
}

testApkDownloadUi().catch((err) => {
  console.error(err);
  process.exit(1);
});
