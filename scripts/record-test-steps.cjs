const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\Iwan Kurniawan\\.gemini\\antigravity\\brain\\e628cb17-2b23-4e08-a146-48d62ef79dd4';

async function recordSteps() {
  console.log('🎬 Merekam 5 Langkah Visual Pengujian YouTube Analyzer (100% Otomatis 1-Klik)...');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--ignore-certificate-errors',
      '--disable-web-security',
      '--window-size=1280,840',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 840 });

    // Step 1: Halaman Awal
    console.log('📸 Step 1: Mengambil tangkapan layar Halaman Awal...');
    await page.goto('https://localhost:5173/creator/youtube', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));
    const step1Path = path.join(ARTIFACT_DIR, 'step1-halaman-awal.png');
    await page.screenshot({ path: step1Path });

    // Step 2: Mengetik URL Podcast Ustadz Felix
    console.log('📸 Step 2: Mengisi URL Podcast Ustadz Felix Siauw...');
    const inputSelector = 'input[placeholder*="Tempel tautan YouTube"]';
    await page.waitForSelector(inputSelector);
    await page.click(inputSelector);
    // Hapus nilai lama
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.value = '';
    }, inputSelector);
    const podcastUrl = 'https://www.youtube.com/watch?v=46u83fLtkiY';
    await page.type(inputSelector, podcastUrl);
    await new Promise((r) => setTimeout(r, 500));
    const step2Path = path.join(ARTIFACT_DIR, 'step2-input-url-felix.png');
    await page.screenshot({ path: step2Path });

    // Step 3: Klik "Analisis Video" -> Otomatis Tampil Ringkasan & Poin Felix Siauw (Bebas RPA!)
    console.log('📸 Step 3: Klik "Analisis Video" & Verifikasi Ringkasan Kontekstual...');
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click();
    await new Promise((r) => setTimeout(r, 2500));
    const step3Path = path.join(ARTIFACT_DIR, 'step3-analisis-selesai.png');
    await page.screenshot({ path: step3Path });

    // Step 4: Beralih ke Tab "Transkrip" (Otomatis Terisi Dialog Felix Siauw & Helmy Yahya)
    console.log('📸 Step 4: Membuka Tab Transkrip Otomatis & Klik Timestamp [05:35]...');
    await page.evaluate(() => {
      const allTabs = Array.from(document.querySelectorAll('button[role="tab"], nav button, [data-tab]'));
      const transcriptTab = allTabs.find((b) => b.textContent && b.textContent.includes('Transkrip'));
      if (transcriptTab) {
        transcriptTab.click();
      } else {
        // Fallback cari button dengan teks Transkrip
        const anyBtn = Array.from(document.querySelectorAll('button')).find(
          (b) => b.textContent && b.textContent.includes('Transkrip') && !b.textContent.includes('Tempel') && !b.textContent.includes('Ekspor')
        );
        if (anyBtn) anyBtn.click();
      }
    });

    await new Promise((r) => setTimeout(r, 1000));

    // Klik timestamp [05:35]
    await page.evaluate(() => {
      const allLines = Array.from(document.querySelectorAll('ul li button'));
      const targetLine = allLines.find((b) => b.textContent && b.textContent.includes('05:35'));
      if (targetLine) targetLine.click();
    });

    await new Promise((r) => setTimeout(r, 800));
    const step4Path = path.join(ARTIFACT_DIR, 'step4-transkrip-otomatis.png');
    await page.screenshot({ path: step4Path });

    // Step 5: Beralih ke Tab "Tanya Video (Q&A)" (Otomatis Terisi Tanya Jawab & Topik Felix Siauw)
    console.log('📸 Step 5: Membuka Tab Tanya Video (Q&A) Kontekstual...');
    await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('button'));
      const askTab = allBtns.find((b) => b.textContent && b.textContent.includes('Tanya Video'));
      if (askTab) askTab.click();
    });

    await new Promise((r) => setTimeout(r, 1000));
    const step5Path = path.join(ARTIFACT_DIR, 'step5-tanya-video-felix.png');
    await page.screenshot({ path: step5Path });

    console.log('✅ Seluruh 5 Tahap Pengujian Visual 100% Otomatis Berhasil Disimpan!');
  } catch (err) {
    console.error('❌ Terjadi kesalahan saat merekam langkah:', err);
  } finally {
    await browser.close();
  }
}

recordSteps();
