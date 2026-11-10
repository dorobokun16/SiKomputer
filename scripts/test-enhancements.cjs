const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'https://localhost:5173';
const ARTIFACT_DIR = process.argv[2] || path.resolve('C:/Users/Iwan Kurniawan/.gemini/antigravity/brain/e628cb17-2b23-4e08-a146-48d62ef79dd4');

async function runTests() {
  const exe = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].find(fs.existsSync);

  console.log('Using browser executable:', exe);
  const browser = await puppeteer.launch({
    executablePath: exe,
    headless: 'new',
    args: ['--no-sandbox', '--ignore-certificate-errors', '--disable-web-security'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 950 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    // ==========================================
    // 1. TEST LOGO & DASHBOARD
    // ==========================================
    console.log('1. Navigasi ke Dashboard & Verifikasi Logo...');
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

    const logoImg = await page.$('img[src="/logo.png"]');
    console.log('Logo /logo.png found:', !!logoImg);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify-logo-dashboard.png') });

    // ==========================================
    // 2. TEST NOTEPAD PRO IN NOTES VAULT
    // ==========================================
    console.log('2. Navigasi ke /productivity/notes & Uji Notepad Window...');
    await page.goto(`${BASE}/productivity/notes`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

    // Klik judul catatan atau tombol Notepad
    const noteHeading = await page.evaluateHandle(() => {
      const headings = Array.from(document.querySelectorAll('h4'));
      return headings.find((h) => h.innerText.includes('Kredensial Server Staging')) || headings[0];
    });

    if (noteHeading && noteHeading.click) {
      console.log('Mengklik judul catatan untuk membuka Notepad...');
      await noteHeading.click();
      await new Promise((r) => setTimeout(r, 800));

      // Verifikasi apakah Notepad Window terbuka
      const notepadTitleBar = await page.$('input[placeholder="Judul Catatan..."]');
      console.log('Notepad Window terbuka:', !!notepadTitleBar);

      // Cek tombol Lebar
      const lebarBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find((b) => b.innerText.includes('Lebar'));
      });
      if (lebarBtn && lebarBtn.click) {
        await lebarBtn.click();
        await new Promise((r) => setTimeout(r, 400));
      }

      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify-notes-notepad.png') });

      // Coba ketik teks tambahan di textarea
      const textarea = await page.$('textarea[placeholder*="Tuliskan catatan panjang"]');
      if (textarea) {
        await textarea.type('\n\n# Catatan Tambahan Developer RPA:\n- Token staging diperbarui oleh Iwan Kurniawan.\n- Endpoint siap digunakan untuk testing pipeline.');
        await new Promise((r) => setTimeout(r, 300));
      }

      // Klik Simpan Catatan
      const saveBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find((b) => b.innerText.includes('Simpan Catatan'));
      });
      if (saveBtn && saveBtn.click) {
        await saveBtn.click();
        await new Promise((r) => setTimeout(r, 600));
      }

      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify-notes-notepad-saved.png') });

      // Tutup notepad
      const closeBtn = await page.$('button[title*="Tutup Notepad"]');
      if (closeBtn) await closeBtn.click();
      await new Promise((r) => setTimeout(r, 300));
    }

    // ==========================================
    // 3. TEST DEV TOOLBOX: TEXT REPLACE
    // ==========================================
    console.log('3. Navigasi ke /tools/toolbox & Uji Text Replace...');
    await page.goto(`${BASE}/tools/toolbox`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

    // Cari tombol Text Replace
    const replaceToolBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find((b) => b.innerText.includes('Text Replace'));
    });

    if (replaceToolBtn) {
      await replaceToolBtn.click();
      await new Promise((r) => setTimeout(r, 600));

      // Verifikasi komponen Find & Replace
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('Text Replace loaded:', bodyText.includes('Cari & Ganti Teks'));

      // Klik Ganti Semua
      const replaceAllBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find((b) => b.innerText.includes('Ganti Semua'));
      });
      if (replaceAllBtn) {
        await replaceAllBtn.click();
        await new Promise((r) => setTimeout(r, 400));
      }

      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify-toolbox-replace.png') });

      // Kembali ke Semua Tool
      const backBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find((b) => b.innerText.includes('Semua Tool'));
      });
      if (backBtn) await backBtn.click();
      await new Promise((r) => setTimeout(r, 500));
    }

    // ==========================================
    // 4. TEST DEV TOOLBOX: SQL GENERATOR
    // ==========================================
    console.log('4. Uji SQL Generator di /tools/toolbox...');
    const sqlToolBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find((b) => b.innerText.includes('SQL Generator'));
    });

    if (sqlToolBtn) {
      await sqlToolBtn.click();
      await new Promise((r) => setTimeout(r, 600));

      // Switch ke CREATE TABLE
      const selects = await page.$$('select');
      if (selects.length >= 2) {
        await selects[1].select('CREATE TABLE');
        await new Promise((r) => setTimeout(r, 300));
      }

      const sqlText = await page.evaluate(() => {
        const pre = document.querySelector('pre');
        return pre ? pre.innerText : '';
      });
      console.log('Generated SQL sample:', sqlText.split('\n')[0]);

      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify-toolbox-sql.png') });
    }

    // ==========================================
    // 5. TEST SETTINGS: KOSONGKAN SEMUA DATA
    // ==========================================
    console.log('5. Navigasi ke /settings & Uji Kosongkan Semua Data...');
    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));

    // Klik tab "Data & Cadangan"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const dataBtn = btns.find((b) => b.innerText.includes('Data & Cadangan'));
      if (dataBtn) dataBtn.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify-settings-tab-data.png') });

    // Klik "Kosongkan Semua Data Lokal"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const resetBtn = btns.find((b) => b.innerText.includes('Kosongkan Semua Data Lokal'));
      if (resetBtn) resetBtn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // Klik konfirmasi "Ya, Hapus Semua Data"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const confirmBtn = btns.find((b) => b.innerText.includes('Ya, Hapus Semua Data'));
      if (confirmBtn) confirmBtn.click();
    });
    console.log('Menunggu reload setelah reset data...');
    await new Promise((r) => setTimeout(r, 2000));

    // Verifikasi setelah reload: periksa apakah tabel tugas kosong
    await page.goto(`${BASE}/productivity/tasks`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify-tasks-empty-after-reset.png') });

    // Periksa juga halaman Catatan
    await page.goto(`${BASE}/productivity/notes`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify-notes-empty-after-reset.png') });

    console.log('Browser errors recorded:', errors.length);
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }
    console.log('Semua pengujian UI berhasil diselesaikan!');
  } finally {
    await browser.close();
  }
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
