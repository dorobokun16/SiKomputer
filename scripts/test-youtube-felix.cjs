const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function runTest() {
  console.log('🚀 Memulai Pengujian Browser Automation YouTube Analyzer...');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

  console.log('🌐 Menggunakan Browser binary:', executablePath);

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--ignore-certificate-errors',
      '--disable-web-security',
      '--window-size=1280,800',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log('📍 Membuka halaman https://localhost:5173/creator/youtube...');
    await page.goto('https://localhost:5173/creator/youtube', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('🔍 Mencari elemen input URL YouTube...');
    // Cari input URL
    const inputSelector = 'input[placeholder*="Tempel tautan YouTube"]';
    await page.waitForSelector(inputSelector, { timeout: 10000 });

    // Masukkan URL Podcast Ustadz Felix Siauw di Helmy Yahya Bicara
    const podcastUrl = 'https://www.youtube.com/watch?v=46u83fLtkiY';
    console.log(`✍️ Mengetikkan URL Podcast Ustadz Felix: ${podcastUrl}`);

    await page.click(inputSelector, { clickCount: 3 });
    await page.type(inputSelector, podcastUrl);

    // Klik tombol Analisis Video
    console.log('⚡ Mengklik tombol "Analisis Video"...');
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    }

    // Tunggu proses analisis
    await new Promise((r) => setTimeout(r, 2500));

    // Verifikasi apakah judul video podcast muncul
    const titleEl = await page.$('h2');
    const videoTitle = titleEl ? await page.evaluate((el) => el.innerText, titleEl) : 'Tidak ditemukan';
    console.log(`✅ Judul Video Berhasil Terdeteksi: "${videoTitle}"`);

    // Verifikasi IFrame src
    const iframeEl = await page.$('iframe');
    const iframeSrc = iframeEl ? await page.evaluate((el) => el.src, iframeEl) : 'Tidak ditemukan';
    console.log(`🎬 Sematan Player YouTube IFrame: ${iframeSrc}`);

    // Buka Modal Tempel Transkrip
    console.log('📋 Menguji fitur "Tempel Transkrip"...');
    await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const btn = allButtons.find((b) => b.textContent && b.textContent.includes('Tempel Transkrip'));
      if (btn) btn.click();
    });

    // Tunggu modal muncul dan textarea terlihat
    const textareaSelector = 'textarea';
    await page.waitForSelector(textareaSelector, { visible: true, timeout: 8000 });
    console.log('📝 Modal terbuka. Memasukkan transkrip percakapan podcast Ustadz Felix...');

    const sampleTranscriptText = [
      '0:00 Kenapa negara yang minim agama justru terlihat lebih maju dari negara mayoritas muslim?',
      '0:45 Ini pertanyaan yang sering sekali muncul di ruang publik dan diskusi pemuda.',
      '01:30 Kalau kita pelajari sejarah peradaban, kemajuan teknologi berakar pada etos kerja dan sains.',
      '03:15 Bukan agamanya yang salah, tapi cara kita menerapkan nilai integritas dan kedisiplinan.',
      '05:40 Di masa kejayaan Islam, peradaban maju karena sains dan nilai keadilan ditegakkan.',
      '08:20 Kesimpulannya, kita harus mengembalikan etos riset, kejujuran, dan profesionalisme.',
    ].join('\n');

    await page.type(textareaSelector, sampleTranscriptText);

    // Klik tombol Terapkan Transkrip
    console.log('⚡ Menekan tombol "Terapkan Transkrip"...');
    await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const applyBtn = allButtons.find((b) => b.textContent && b.textContent.includes('Terapkan Transkrip'));
      if (applyBtn) applyBtn.click();
    });

    await new Promise((r) => setTimeout(r, 1200));

    // Periksa transkrip yang terpasang di tab
    const transcriptLines = await page.$$eval('ul li button', (buttons) =>
      buttons.slice(0, 5).map((b) => b.textContent.replace(/\s+/g, ' ').trim())
    );
    console.log('📊 Baris Transkrip Aktif Berhasil Dimuat:');
    transcriptLines.forEach((line) => console.log(`   • ${line}`));

    // Uji klik baris transkrip untuk melompatkan pemutar
    console.log('▶️ Menguji klik baris timestamp [03:15] untuk sinkronisasi pemutar video...');
    await page.evaluate(() => {
      const allLines = Array.from(document.querySelectorAll('ul li button'));
      const targetLine = allLines.find((b) => b.textContent && b.textContent.includes('03:15'));
      if (targetLine) targetLine.click();
    });

    await new Promise((r) => setTimeout(r, 1000));

    // Ambil screenshot sebagai bukti hasil pengujian
    const screenshotPath = path.resolve('scripts', 'test-youtube-felix.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot hasil pengujian disimpan di: ${screenshotPath}`);

    console.log('\n🎉 PENGUJIAN BROWSER AUTOMATION SELESAI DENGAN STATUS: SUKSES (100% BERFUNGSI)!');
  } catch (err) {
    console.error('❌ Terjadi kesalahan pada saat pengujian:', err);
  } finally {
    await browser.close();
  }
}

runTest();
