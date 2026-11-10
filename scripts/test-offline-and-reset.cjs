const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = 'https://localhost:4173';
const ARTIFACT_DIR = path.resolve('C:/Users/Iwan Kurniawan/.gemini/antigravity/brain/e628cb17-2b23-4e08-a146-48d62ef79dd4');

async function runTests() {
  const exe = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].find(fs.existsSync);

  const browser = await puppeteer.launch({
    executablePath: exe,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--ignore-certificate-errors',
      '--allow-insecure-localhost',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 950 });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    console.log('1. Membuka production build di', BASE);
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));

    // Verifikasi Service Worker terpasang dan mengisi cache
    const swStatus = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { supported: false };
      try {
        const reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((_, rej) => setTimeout(() => rej(new Error('SW timeout')), 6000)),
        ]);
        const keys = await caches.keys();
        let cachedCount = 0;
        let hasPdfWorker = false;
        let hasLogo = false;
        for (const k of keys) {
          const cache = await caches.open(k);
          const reqs = await cache.keys();
          cachedCount += reqs.length;
          for (const req of reqs) {
            if (req.url.includes('pdf.worker.min')) hasPdfWorker = true;
            if (req.url.includes('/logo.png')) hasLogo = true;
          }
        }
        return {
          supported: true,
          active: !!reg.active,
          cacheNames: keys,
          cachedCount,
          hasPdfWorker,
          hasLogo,
        };
      } catch (e) {
        return { supported: true, error: e.message };
      }
    });
    console.log('Service Worker status:', JSON.stringify(swStatus));

    // Kunjungi /productivity/tasks sekali agar initial demo data ter-seed (menguji skenario reset nanti)
    await page.goto(`${BASE}/productivity/tasks`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    await page.goto(`${BASE}/productivity/reminders`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    await page.goto(`${BASE}/tools/vault`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));

    // Verifikasi Dashboard menampilkan data live sebelum reset
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify-dashboard-live-before-reset.png') });

    // 2. UJI MODE OFFLINE PENUH (Simulasi Laptop/HP Tanpa Internet)
    console.log('2. Mengaktifkan Chrome Offline Mode (setOfflineMode=true)...');
    await page.setOfflineMode(true);

    const routesToCheckOffline = [
      { path: '/', checkText: 'Selamat datang' },
      { path: '/dev/base64', checkText: 'Base64 Studio' },
      { path: '/dev/pdf-repair', checkText: 'PDF Repair' },
      { path: '/dev/image-studio', checkText: 'Image Studio' },
      { path: '/dev/spreadsheet', checkText: 'Konverter CSV & XLSX' },
      { path: '/dev/rpa-monitoring', checkText: 'Monitoring RPA' },
      { path: '/dev/api-tester', checkText: 'API Tester' },
      { path: '/productivity/tasks', checkText: 'Tugas & Papan Kanban' },
      { path: '/productivity/backlog', checkText: 'Project Backlog' },
      { path: '/productivity/reminders', checkText: 'Reminder' },
      { path: '/productivity/notes', checkText: 'Catatan & Kredensial' },
      { path: '/productivity/date-calc', checkText: 'Kalkulator Tanggal' },
      { path: '/tools/toolbox', checkText: 'Dev Toolbox' },
      { path: '/tools/vault', checkText: 'Snippet & Prompt Vault' },
      { path: '/settings', checkText: 'Pengaturan' },
    ];

    for (const r of routesToCheckOffline) {
      // Gunakan navigasi SPA atau page.goto offline (testing SW offline fallback juga!)
      await page.goto(`${BASE}${r.path}`, { waitUntil: 'domcontentloaded' });
      await new Promise((res) => setTimeout(res, 400));
      const text = await page.evaluate(() => document.body.innerText);
      const ok = text.includes(r.checkText);
      console.log(`  [OFFLINE] ${r.path.padEnd(26)} -> ${ok ? 'OK' : 'FAIL'} ("${r.checkText}")`);
      if (!ok) {
        throw new Error(`Offline route check failed for ${r.path}`);
      }
    }

    // Matikan offline mode untuk uji unduhan binary .exe & .zip
    await page.setOfflineMode(false);
    console.log('3. Menguji HTTP status unduhan .exe & .app.zip...');
    const dlCheck = await page.evaluate(async () => {
      const r1 = await fetch('/downloads/SiKomputer.exe', { method: 'HEAD' });
      const r2 = await fetch('/downloads/SiKomputer-macOS.zip', { method: 'HEAD' });
      return {
        exeStatus: r1.status,
        exeLength: r1.headers.get('content-length'),
        macStatus: r2.status,
        macLength: r2.headers.get('content-length'),
      };
    });
    console.log('Download check:', JSON.stringify(dlCheck));
    if (dlCheck.exeStatus !== 200 || dlCheck.macStatus !== 200) {
      throw new Error('Download binaries returned non-200 status');
    }

    // 4. UJI KOSONGKAN SEMUA DATA & VERIFIKASI DASHBOARD BERSIH TOTAL
    console.log('4. Menguji Kosongkan Semua Data Lokal...');
    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const dataBtn = btns.find((b) => b.innerText.includes('Data & Cadangan'));
      if (dataBtn) dataBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const resetBtn = btns.find((b) => b.innerText.includes('Kosongkan Semua Data Lokal'));
      if (resetBtn) resetBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const confirmBtn = btns.find((b) => b.innerText.includes('Ya, Hapus Semua Data'));
      if (confirmBtn) confirmBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1800));

    // Navigasi ke Dashboard dan uji dalam mode offline juga!
    await page.setOfflineMode(true);
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 800));

    const dashText = await page.evaluate(() => document.body.innerText);
    const hasZeroRatio = dashText.includes('0/0');
    const hasEmptyTasks = dashText.includes('Belum ada tugas aktif');
    const hasEmptyActivity = dashText.includes('Belum ada aktivitas tercatat');
    const noStaticDate = !dashText.includes('Senin, 9 November 2026');
    const noStaticSnippet = !dashText.includes('18\nSnippet') && !dashText.includes('Rapat vendor API');

    console.log('Dashboard after reset checks:', {
      hasZeroRatio,
      hasEmptyTasks,
      hasEmptyActivity,
      noStaticDate,
      noStaticSnippet,
    });

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify-dashboard-empty-after-reset.png') });

    if (!hasZeroRatio || !hasEmptyTasks || !hasEmptyActivity || !noStaticDate || !noStaticSnippet) {
      throw new Error('Dashboard still showing static/non-empty data after reset!');
    }

    console.log('Page errors:', pageErrors.length);
    if (pageErrors.length > 0) console.log('Errors:', pageErrors);
    console.log('ALL OFFLINE + RESET + PORTABLE CHECKS PASSED!');
  } finally {
    await browser.close();
  }
}

runTests().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
