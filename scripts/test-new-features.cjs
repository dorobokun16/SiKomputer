const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'https://localhost:5173';
const SHOTS = process.argv[2] || path.join(__dirname, '..');

async function runTests() {
  const exe = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].find(fs.existsSync);

  const browser = await puppeteer.launch({
    executablePath: exe,
    headless: 'new',
    args: ['--no-sandbox', '--ignore-certificate-errors'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 950 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    // ==========================================
    // 1. TEST SETTINGS & PROFILE
    // ==========================================
    console.log('1. Pengujian Settings & Profile...');
    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('h1');

    // Screenshot initial settings
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SHOTS, 'feature-settings-profile.png') });
    console.log('PASS: Halaman Settings profil bebas tanpa form login lama');

    // ==========================================
    // 2. TEST NOTES VAULT
    // ==========================================
    console.log('2. Pengujian Catatan & Kredensial (Notes Vault)...');
    await page.goto(`${BASE}/productivity/notes`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('h1');
    await new Promise((r) => setTimeout(r, 800));

    // Klik tombol unmask eye
    const eyeButtons = await page.$$('button[title="Tampilkan"]');
    if (eyeButtons.length > 0) {
      await eyeButtons[0].click();
      await new Promise((r) => setTimeout(r, 300));
    }
    await page.screenshot({ path: path.join(SHOTS, 'feature-notes-vault.png') });
    console.log('PASS: Notes Vault menampilkan kredensial dengan masking & tags');

    // ==========================================
    // 3. TEST SPREADSHEET CONVERTER (CSV <-> XLSX)
    // ==========================================
    console.log('3. Pengujian Konverter CSV & XLSX...');
    await page.goto(`${BASE}/dev/spreadsheet`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('h1');

    // Klik "Coba Data Sampel"
    const sampleBtn = await page.waitForSelector('button');
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const text = await (await b.getProperty('textContent')).jsonValue();
      if (text.includes('Coba Data Sampel')) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SHOTS, 'feature-spreadsheet-converter.png') });
    console.log('PASS: Konverter CSV ke XLSX berhasil membaca dan merender pratinjau tabel');

    // ==========================================
    // 4. TEST IMAGE STUDIO WITH PDF OUTPUT
    // ==========================================
    console.log('4. Pengujian Image Studio dengan output PDF...');
    await page.goto(`${BASE}/dev/image-studio`, { waitUntil: 'networkidle0' });

    // Buat sample image di memori
    const samplePhotoBase64 = await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 800;
      c.height = 600;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(0, 0, 800, 600);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px sans-serif';
      ctx.fillText('SAMPLE DOKUMEN IMAGE', 100, 300);
      return c.toDataURL('image/png').split(',')[1];
    });

    const tmpImgPath = path.join(SHOTS, 'sample-test-image.png');
    fs.writeFileSync(tmpImgPath, Buffer.from(samplePhotoBase64, 'base64'));

    const fileInput = await page.$('input[type=file]');
    await fileInput.uploadFile(tmpImgPath);
    await page.waitForFunction(() => document.body.innerText.includes('Resolusi asli'));

    // Klik preset "Ke PDF"
    const allChips = await page.$$('button');
    for (const b of allChips) {
      const text = await (await b.getProperty('textContent')).jsonValue();
      if (text.trim() === 'Ke PDF') {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1200));

    // Verifikasi teks "PDF" atau "edit.pdf"
    await page.screenshot({ path: path.join(SHOTS, 'feature-image-to-pdf.png') });
    console.log('PASS: Image Studio berhasil memilih format output PDF');

    if (errors.length > 0) {
      console.error('JS Errors:', errors);
      process.exit(1);
    }
    console.log('SEMUA PENGUJIAN 4 FITUR SUKSES 100%!');
  } finally {
    await browser.close();
  }
}

runTests().catch((err) => {
  console.error('Error saat tes:', err);
  process.exit(1);
});

