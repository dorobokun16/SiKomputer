/* Uji end-to-end fitur PDF Repair: buat PDF sehat + PDF rusak, upload via browser, unduh hasil, verifikasi. */
const puppeteer = require('puppeteer-core')
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', 'tmp-pdf-test')
const SHOTS = process.argv[2] || OUT
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(SHOTS, { recursive: true })

async function makeSamples() {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (let i = 1; i <= 3; i++) {
    const p = doc.addPage([595, 842])
    p.drawText(`Dokumen Uji - Halaman ${i}`, { x: 60, y: 760, size: 24, font, color: rgb(0, 0, 0) })
    p.drawText('Isi dokumen ini tidak boleh berubah setelah dicetak ulang.', { x: 60, y: 720, size: 12, font })
    p.drawRectangle({ x: 60, y: 600, width: 200, height: 80, borderColor: rgb(0.1, 0.3, 0.8), borderWidth: 2 })
  }
  const good = Buffer.from(await doc.save({ useObjectStreams: false }))
  // Rusak 1: xref/trailer terpotong (kasus umum "PDF corrupt")
  const broken = good.subarray(0, good.length - 120)
  // Rusak 2: startxref salah offset
  const wrongXref = Buffer.from(good.toString('latin1').replace(/startxref\s+\d+/, 'startxref\n999999'), 'latin1')
  // Rusak 3: sampah di depan header -> semua offset xref bergeser (sering dari email/scan tool)
  const shifted = Buffer.concat([Buffer.from('JUNK-DATA-'.repeat(30)), good])
  // Rusak 4: isi tabel xref diacak tapi trailer utuh
  const badTable = Buffer.from(good.toString('latin1').replace(/(\d{10}) 00000 n/g, '0000000007 00000 n'), 'latin1')
  fs.writeFileSync(path.join(OUT, 'rusak-geser.pdf'), shifted)
  fs.writeFileSync(path.join(OUT, 'rusak-tabel.pdf'), badTable)
  fs.writeFileSync(path.join(OUT, 'sehat.pdf'), good)
  fs.writeFileSync(path.join(OUT, 'rusak-terpotong.pdf'), broken)
  fs.writeFileSync(path.join(OUT, 'rusak-xref.pdf'), wrongXref)
  fs.writeFileSync(path.join(OUT, 'bukan-pdf.pdf'), 'ini bukan pdf')
}

async function run() {
  await makeSamples()
  const exe = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(fs.existsSync)
  const browser = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--no-sandbox', '--ignore-certificate-errors'] })
  const results = []
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 900 })
    const cdp = await page.createCDPSession()
    await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: OUT })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))

    for (const [sample, mode] of [
      ['sehat.pdf', 'rebuild'],
      ['rusak-terpotong.pdf', 'rebuild'],
      ['rusak-terpotong.pdf', 'reprint'],
      ['rusak-xref.pdf', 'rebuild'],
      ['rusak-geser.pdf', 'rebuild'],
      ['rusak-geser.pdf', 'reprint'],
      ['rusak-tabel.pdf', 'rebuild'],
      ['rusak-tabel.pdf', 'reprint'],
      ['bukan-pdf.pdf', 'rebuild'],
    ]) {
      await page.goto('https://localhost:5173/dev/pdf-repair', { waitUntil: 'networkidle0' })
      const input = await page.waitForSelector('input[type=file]')
      await input.uploadFile(path.join(OUT, sample))
      if (mode === 'reprint') {
        await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Cetak Ulang') && !b.textContent.includes('PDF'))?.click())
      }
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Cetak Ulang PDF'))?.click())
      await page.waitForFunction(() => document.body.innerText.includes('Unduh ') || document.body.innerText.includes('Berkas ini bukan PDF') || document.body.innerText.includes('terlalu rusak') || document.body.innerText.includes('Gagal'), { timeout: 60000 })
      await new Promise((r) => setTimeout(r, 800))
      const text = await page.evaluate(() => document.body.innerText)
      const ok = text.includes('Unduh ')
      const verified = text.includes('Terverifikasi dapat dibuka')
      await page.screenshot({ path: path.join(SHOTS, `pdf-${sample.replace('.pdf', '')}-${mode}.png`) })
      let extra = ''
      if (ok) {
        const out = path.join(OUT, sample.replace('.pdf', '-fixed.pdf'))
        if (fs.existsSync(out)) fs.unlinkSync(out)
        await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Unduh '))?.click())
        for (let i = 0; i < 20 && !fs.existsSync(out); i++) await new Promise((r) => setTimeout(r, 300))
        if (fs.existsSync(out)) {
          const copy = path.join(OUT, `${mode}-${sample.replace('.pdf', '')}-fixed.pdf`)
          fs.renameSync(out, copy)
          const reopened = await PDFDocument.load(fs.readFileSync(copy))
          extra = ` | file unduhan ${fs.statSync(copy).size}B, dibuka ulang pdf-lib: ${reopened.getPageCount()} hal`
        } else extra = ' | file TIDAK terunduh'
      } else {
        extra = ' | pesan: ' + (text.match(/(Berkas ini bukan PDF[^\n]*|Struktur PDF[^\n]*|Gagal[^\n]*)/) || [''])[0]
      }
      results.push(`${sample} [${mode}] -> ${ok ? 'BERHASIL' : 'DITOLAK'} verified=${verified}${extra}`)
    }
    if (errors.length) results.push('PAGE ERRORS: ' + errors.join(' || '))
  } finally {
    await browser.close()
  }
  console.log(results.join('\n'))
}
run().catch((e) => {
  console.error('GAGAL', e)
  process.exit(1)
})


