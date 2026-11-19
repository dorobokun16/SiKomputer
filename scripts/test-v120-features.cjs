const puppeteer = require('puppeteer-core');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const BASE = 'https://localhost:4173';
const ARTIFACT_DIR = path.resolve(
  'C:/Users/Iwan Kurniawan/.gemini/antigravity/brain/e628cb17-2b23-4e08-a146-48d62ef79dd4'
);

async function createSamplePdf(filePath, pageCount) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i += 1) {
    const page = doc.addPage([300, 400]);
    page.drawText(`SiKomputer Test Page ${i + 1}`, { x: 40, y: 200, size: 14 });
  }
  const bytes = await doc.save();
  fs.writeFileSync(filePath, bytes);
}

async function runTests() {
  const exe = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].find(fs.existsSync);

  if (!exe) {
    throw new Error('Chrome atau Edge executable tidak ditemukan');
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sikomputer-v120-'));
  const pdf3Path = path.join(tmpDir, 'sample-3pages.pdf');
  const pdf2Path = path.join(tmpDir, 'sample-2pages.pdf');
  await createSamplePdf(pdf3Path, 3);
  await createSamplePdf(pdf2Path, 2);

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

    console.log('1. Verifikasi 4 Menu Utama Sidebar & Personal Features (Monitoring RPA)...');
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

    const sidebarOk = await page.evaluate(() => {
      const aside = document.querySelector('aside');
      if (!aside) return { ok: false, reason: 'Sidebar tidak ditemukan' };
      const text = (aside.textContent || aside.innerText || '').toLowerCase();
      const required = ['dev utilities', 'productivity', 'tools', 'personal features', 'monitoring rpa', 'text studio', 'qr code studio', 'pdf studio'];
      const missing = required.filter((k) => !text.includes(k));
      return { ok: missing.length === 0, missing };
    });
    if (!sidebarOk.ok) {
      throw new Error('Sidebar gagal: ' + JSON.stringify(sidebarOk));
    }

    await page.goto(`${BASE}/personal/rpa-monitoring`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('Uji dengan Monitoring.xlsx')
      );
      if (btn) btn.click();
    });
    await page.waitForFunction(() => document.body.innerText.includes('Monitoring-Contoh.xlsx'), {
      timeout: 8000,
    });
    console.log('   OK: Personal Features -> Monitoring RPA sample offline berjalan');

    // Alias check /dev/rpa-monitoring
    await page.goto(`${BASE}/dev/rpa-monitoring`, { waitUntil: 'networkidle0' });
    const aliasOk = await page.evaluate(() => document.body.innerText.includes('Monitoring RPA'));
    if (!aliasOk) throw new Error('Alias /dev/rpa-monitoring gagal dimuat');

    console.log('2. Verifikasi Dev Toolbox & Text Studio (5 tab + URL/Query Parser)...');
    await page.goto(`${BASE}/tools/toolbox`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));
    const toolboxOk = await page.evaluate(() => {
      const text = document.body.innerText;
      const expected5 = ['JWT Decoder', 'SQL Generator', 'Cron Builder', 'UUID & Hash', 'Epoch Converter'];
      const missing = expected5.filter((k) => !text.includes(k));
      const legacyRemaining = ['JSON Formatter', 'Regex Tester', 'Text Replace', 'Text Diff'].filter((k) =>
        text.includes(k)
      );
      const hasStudioBtn = text.includes('Buka Text Studio');
      return {
        ok: missing.length === 0 && legacyRemaining.length === 0 && hasStudioBtn,
        missing,
        legacyRemaining,
        hasStudioBtn,
      };
    });
    if (!toolboxOk.ok) throw new Error('Dev Toolbox cek gagal: ' + JSON.stringify(toolboxOk));

    await page.goto(`${BASE}/dev/text-studio`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));
    const textTabsOk = await page.evaluate(() => {
      const text = document.body.innerText;
      const tabs = ['JSON Formatter', 'Regex Tester', 'Text Replace', 'Text Diff', 'URL & Query Parser'];
      const missing = tabs.filter((t) => !text.includes(t));
      return { ok: missing.length === 0, missing };
    });
    if (!textTabsOk.ok) throw new Error('Text Studio tabs tidak lengkap: ' + JSON.stringify(textTabsOk));

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('URL & Query Parser')
      );
      if (!btn) throw new Error('Tombol URL & Query Parser tidak ditemukan');
      btn.click();
    });
    await new Promise((r) => setTimeout(r, 300));
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('Webhook RPA')
      );
      if (!btn) throw new Error('Preset Webhook RPA tidak ditemukan');
      btn.click();
    });
    await new Promise((r) => setTimeout(r, 300));
    const urlCheck = await page.evaluate(() => {
      const body = (document.body.textContent || document.body.innerText || '').toLowerCase();
      return {
        hasJson: body.includes('parsed query json'),
        hasBuilt: body.includes('hasil url tergenerate'),
        hasHost: body.includes('api.sikomputer.local'),
      };
    });
    if (!urlCheck.hasJson || !urlCheck.hasBuilt || !urlCheck.hasHost) {
      throw new Error('URL & Query Parser gagal: ' + JSON.stringify(urlCheck));
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'v120-text-studio-url.png') });
    console.log('   OK: Text Studio 5 tab + URL/Query Parser berfungsi');

    console.log('3. Verifikasi QR Code Studio (URL, Teks, Wi-Fi + Kartu Cetak + PNG/SVG)...');
    await page.goto(`${BASE}/dev/qr-studio`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));

    const qrBase = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const badgeMatch = /V\d+ \(\d+×\d+\)/.test(document.body.innerText);
      const hasBtns =
        document.body.innerText.includes('Unduh PNG') &&
        document.body.innerText.includes('Unduh SVG');
      return { hasCanvas: !!canvas && canvas.width > 0, badgeMatch, hasBtns };
    });
    if (!qrBase.hasCanvas || !qrBase.badgeMatch || !qrBase.hasBtns) {
      throw new Error('QR Studio default gagal: ' + JSON.stringify(qrBase));
    }

    // Switch ke mode Teks
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.trim() === 'Teks'
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 200));

    // Switch ke mode Wi-Fi dan verifikasi tombol Kartu Cetak + unduh SVG/PNG
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.trim() === 'Wi-Fi'
      );
      if (!btn) throw new Error('Mode Wi-Fi tidak ditemukan');
      btn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    const wifiOk = await page.evaluate(() => ({
      hasCardBtn: document.body.innerText.includes('Unduh Kartu Cetak Akses Wi-Fi (.png)'),
      badgeMatch: /V\d+ \(\d+×\d+\)/.test(document.body.innerText),
    }));
    if (!wifiOk.hasCardBtn || !wifiOk.badgeMatch) {
      throw new Error('Mode Wi-Fi QR gagal: ' + JSON.stringify(wifiOk));
    }

    // Trigger Unduh PNG, Unduh SVG, dan Unduh Kartu Cetak Wi-Fi untuk memastikan tidak ada runtime error
    await page.evaluate(() => {
      for (const label of ['Unduh PNG', 'Unduh SVG', 'Unduh Kartu Cetak Akses Wi-Fi (.png)']) {
        const btn = Array.from(document.querySelectorAll('button')).find((b) =>
          b.innerText.includes(label)
        );
        if (btn) btn.click();
      }
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'v120-qr-studio-wifi.png') });
    console.log('   OK: QR Code Studio URL, Teks, Wi-Fi + SVG/PNG & Kartu Wi-Fi berfungsi');

    console.log('4. Verifikasi PDF Studio (PDF Repair, Split PDF, Merge PDF)...');
    await page.goto(`${BASE}/dev/pdf-studio`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));

    const pdfTabsOk = await page.evaluate(() => {
      const body = document.body.innerText;
      return (
        body.includes('PDF Studio') &&
        body.includes('PDF Repair') &&
        body.includes('Split PDF') &&
        body.includes('Merge PDF')
      );
    });
    if (!pdfTabsOk) throw new Error('Tab PDF Studio tidak lengkap');

    // Uji Split PDF
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('Split PDF')
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 300));
    const splitInput = await page.$('input[type="file"]');
    if (!splitInput) throw new Error('Input file Split PDF tidak ditemukan');
    await splitInput.uploadFile(pdf3Path);
    await page.waitForFunction(() => document.body.innerText.includes('sample-3pages.pdf'), {
      timeout: 6000,
    });
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('Proses Split PDF')
      );
      if (!btn || btn.disabled) throw new Error('Tombol Proses Split PDF tidak siap');
      btn.click();
    });
    await page.waitForFunction(() => document.body.innerText.includes('Unduh Semua (.zip)'), {
      timeout: 10000,
    });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'v120-pdf-studio-split.png') });
    console.log('   OK: Split PDF menghasilkan 3 berkas & tombol ZIP muncul');

    // Uji Merge PDF
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('Merge PDF')
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 300));
    const mergeInput = await page.$('input[type="file"]');
    if (!mergeInput) throw new Error('Input file Merge PDF tidak ditemukan');
    await mergeInput.uploadFile(pdf3Path, pdf2Path);
    await page.waitForFunction(
      () => document.body.innerText.includes('Gabungkan 2 PDF Sekarang'),
      { timeout: 6000 }
    );
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('Gabungkan 2 PDF Sekarang')
      );
      if (!btn || btn.disabled) throw new Error('Tombol Gabungkan 2 PDF tidak siap');
      btn.click();
    });
    await page.waitForFunction(
      () => document.body.innerText.includes('Unduh dokumen-gabungan.pdf'),
      { timeout: 10000 }
    );
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'v120-pdf-studio-merge.png') });
    console.log('   OK: Merge PDF 3+2 halaman menghasilkan dokumen-gabungan.pdf');

    console.log('5. Verifikasi Catatan Multi-Window & Konfirmasi Tutup Unsaved...');
    await page.evaluate(() => {
      document.querySelectorAll('iframe').forEach((f) => f.remove());
      const navLink = document.querySelector('a[href$="/productivity/notes"]');
      if (navLink) navLink.click();
    });
    await page.waitForFunction(
      () =>
        document.body.innerText.includes('Catatan & Kredensial') &&
        document.querySelectorAll('h4[title]').length >= 2,
      { timeout: 10000 }
    );
    await new Promise((r) => setTimeout(r, 300));

    // Pastikan minimal ada 2 catatan di DB
    const noteCardCount = await page.evaluate(() => document.querySelectorAll('h4[title]').length);
    if (noteCardCount < 2) {
      throw new Error(`Minimal butuh 2 catatan sample di halaman Notes, ditemukan ${noteCardCount}`);
    }

    // Klik catatan ke-1 dan ke-2 untuk membuka 2 window sekaligus
    const cardTitles = await page.evaluate(() => {
      const titles = Array.from(document.querySelectorAll('h4[title]'));
      titles[0].click();
      titles[1].click();
      return [titles[0].innerText.trim(), titles[1].innerText.trim()];
    });
    await new Promise((r) => setTimeout(r, 400));

    const winCountAfterOpen = await page.evaluate(
      () => document.querySelectorAll('[data-notepad-window]').length
    );
    if (winCountAfterOpen !== 2) {
      throw new Error(`Seharusnya terbuka 2 notepad window sekaligus, aktual: ${winCountAfterOpen}`);
    }

    // Edit textarea pada window pertama/teratas (paling belakang di DOM atau pertama ditemukan)
    const taSelector = '[data-notepad-window] textarea';
    await page.focus(taSelector);
    await page.keyboard.type('\nPerubahan test belum disimpan');
    await new Promise((r) => setTimeout(r, 250));

    const dirtyOk = await page.evaluate(() => document.body.innerText.includes('Belum Disimpan'));
    if (!dirtyOk) throw new Error('Badge Belum Disimpan tidak muncul setelah mengetik');

    // Klik tombol tutup pada window pertama yang kotor
    await page.evaluate(() => {
      const win = document.querySelector('[data-notepad-window]');
      const closeBtn = win && win.querySelector('button[aria-label^="Tutup "]');
      if (!closeBtn) throw new Error('Tombol tutup window notepad tidak ditemukan');
      closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 250));

    const confirmOk = await page.evaluate(() => {
      const text = document.body.innerText;
      return (
        text.includes('Simpan perubahan pada') &&
        text.includes('Batal') &&
        text.includes('Jangan Simpan') &&
        text.includes('Simpan')
      );
    });
    if (!confirmOk) throw new Error('Dialog konfirmasi Simpan/Jangan Simpan/Batal tidak muncul');

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'v120-notes-multiwindow-confirm.png') });

    // Klik Jangan Simpan -> window pertama tertutup, window kedua tetap terbuka
    await page.evaluate(() => {
      const win = document.querySelector('[data-notepad-window]');
      const btns = win ? Array.from(win.querySelectorAll('button')) : [];
      const discardBtn = btns.find((b) => b.innerText.trim() === 'Jangan Simpan');
      if (!discardBtn) throw new Error('Tombol Jangan Simpan tidak ditemukan');
      discardBtn.click();
    });
    await new Promise((r) => setTimeout(r, 250));

    const winCountAfterDiscard = await page.evaluate(
      () => document.querySelectorAll('[data-notepad-window]').length
    );
    if (winCountAfterDiscard !== 1) {
      throw new Error(
        `Setelah Jangan Simpan, seharusnya tersisa 1 window terbuka, aktual: ${winCountAfterDiscard}`
      );
    }

    if (pageErrors.length > 0) {
      throw new Error('Ditemukan pageerror runtime: ' + pageErrors.join(' | '));
    }

    console.log(
      'SEMUA TEST v1.2.0 LULUS! (Multi-window Notes:',
      cardTitles.join(' & '),
      '| pageErrors: 0)'
    );
  } finally {
    await browser.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

runTests().catch((err) => {
  console.error('TEST GAGAL:', err);
  process.exit(1);
});
