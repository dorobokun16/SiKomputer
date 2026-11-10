/* Uji end-to-end Image Studio: kompres target ukuran, upscale, rotasi, batch ZIP. */
const puppeteer = require('puppeteer-core')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const BASE = process.env.BASE_URL || 'https://localhost:5173'
const OUT = path.join(__dirname, '..', 'tmp-image-test')
const SHOTS = process.argv[2] || OUT
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

const clickText = (page, txt) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(t))
    if (!el) throw new Error('Tombol tidak ditemukan: ' + t)
    el.click()
  }, txt)
const bodyText = (page) => page.evaluate(() => document.body.innerText)
const stat = (page, label) =>
  page.evaluate((l) => {
    const el = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && d.textContent === l)
    return el?.nextElementSibling?.textContent?.trim() ?? null
  }, label)
const waitDone = async (page) => {
  await new Promise((r) => setTimeout(r, 500))
  await page.waitForFunction(() => !document.body.innerText.includes('Memproses…'), { timeout: 60000 })
  await new Promise((r) => setTimeout(r, 300))
}

async function run() {
  const exe = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(fs.existsSync)
  const browser = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--no-sandbox', '--ignore-certificate-errors'] })
  const log = []
  const check = (name, ok, info = '') => log.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`)
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 1000 })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    const cdp = await page.createCDPSession()
    await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: OUT })

    await page.goto(`${BASE}/dev/image-studio`, { waitUntil: 'networkidle0' })

    // Buat gambar uji di browser: foto "bertekstur" 1600x1200 (PNG besar) + logo transparan 400x300
    const samples = await page.evaluate(async () => {
      const make = (w, h, draw) => {
        const c = document.createElement('canvas')
        c.width = w
        c.height = h
        draw(c.getContext('2d'), w, h)
        return c.toDataURL('image/png').split(',')[1]
      }
      const photo = make(1600, 1200, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, w, h)
        g.addColorStop(0, '#1e3a8a')
        g.addColorStop(0.5, '#f59e0b')
        g.addColorStop(1, '#10b981')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)
        const img = ctx.getImageData(0, 0, w, h)
        for (let i = 0; i < img.data.length; i += 4) {
          const n = (Math.random() - 0.5) * 60
          img.data[i] += n
          img.data[i + 1] += n
          img.data[i + 2] += n
        }
        ctx.putImageData(img, 0, 0)
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 90px sans-serif'
        ctx.fillText('FOTO UJI 1600x1200', 120, 620)
      })
      const logo = make(400, 300, (ctx) => {
        ctx.fillStyle = '#6366f1'
        ctx.beginPath()
        ctx.arc(200, 150, 110, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 48px sans-serif'
        ctx.fillText('LOGO', 135, 168)
      })
      return { photo, logo }
    })
    fs.writeFileSync(path.join(OUT, 'foto-uji.png'), Buffer.from(samples.photo, 'base64'))
    fs.writeFileSync(path.join(OUT, 'logo.png'), Buffer.from(samples.logo, 'base64'))
    const photoSize = fs.statSync(path.join(OUT, 'foto-uji.png')).size

    const input = await page.$('input[type=file]')
    await input.uploadFile(path.join(OUT, 'foto-uji.png'))
    await page.waitForFunction(() => document.body.innerText.includes('Resolusi asli'))
    await waitDone(page)
    check('Upload & baca gambar', (await stat(page, 'Resolusi asli')) === '1600×1200', `asli ${(photoSize / 1024).toFixed(0)} KB`)

    // 1. Preset Upload < 500 KB
    await clickText(page, 'Upload < 500 KB')
    await waitDone(page)
    let size = await stat(page, 'Ukuran hasil')
    let kb = size?.includes('MB') ? parseFloat(size) * 1024 : parseFloat(size)
    let txt = await bodyText(page)
    check('Kompres target < 500 KB', kb <= 500 && txt.includes('JPEG'), `hasil ${size}`)
    await page.screenshot({ path: path.join(SHOTS, 'img-kompres-500kb.png') })

    // unduh satu
    await clickText(page, 'Unduh')
    for (let i = 0; i < 20 && !fs.existsSync(path.join(OUT, 'foto-uji-edit.jpg')); i++) await new Promise((r) => setTimeout(r, 250))
    const dl = path.join(OUT, 'foto-uji-edit.jpg')
    const head = fs.existsSync(dl) ? fs.readFileSync(dl).subarray(0, 3).toString('hex') : ''
    check('Unduh file tunggal (JPEG valid)', head === 'ffd8ff', fs.existsSync(dl) ? `${(fs.statSync(dl).size / 1024).toFixed(1)} KB` : 'tidak terunduh')

    // 2. Upscale 2x
    await clickText(page, 'Upscale 2×')
    await waitDone(page)
    check('Upscale 2× -> 3200×2400', (await stat(page, 'Resolusi hasil')) === '3200×2400', `hasil ${await stat(page, 'Ukuran hasil')}`)
    await page.screenshot({ path: path.join(SHOTS, 'img-upscale-2x.png') })

    // 3. Reset + rotasi kanan + persen 50
    await clickText(page, 'Reset')
    await clickText(page, 'Kanan')
    await clickText(page, 'Persen')
    await clickText(page, '50%')
    await waitDone(page)
    check('Rotasi 90° + skala 50% -> 600×800', (await stat(page, 'Resolusi hasil')) === '600×800')

    // 4. Logo transparan -> WebP + batch ZIP
    await clickText(page, 'Reset')
    await clickText(page, 'Ke WebP')
    await input.uploadFile(path.join(OUT, 'logo.png'))
    await page.waitForFunction(() => document.body.innerText.includes('Daftar gambar (2)'))
    await clickText(page, 'Proses & Unduh Semua')
    let zip = null
    for (let i = 0; i < 60 && !zip; i++) {
      await new Promise((r) => setTimeout(r, 250))
      zip = fs.readdirSync(OUT).find((f) => f.endsWith('.zip') && !f.endsWith('.crdownload'))
    }
    if (zip) {
      const listing = execSync(`tar -tf "${path.join(OUT, zip)}"`).toString().trim().split(/\r?\n/)
      check('Batch ZIP berisi 2 file WebP', listing.length === 2 && listing.every((n) => n.endsWith('.webp')), listing.join(', '))
      execSync(`tar -xf "${path.join(OUT, zip)}" -C "${OUT}"`)
      const riff = fs.readFileSync(path.join(OUT, 'logo-edit.webp')).subarray(8, 12).toString()
      check('File di dalam ZIP valid (WEBP)', riff === 'WEBP')
    } else check('Batch ZIP terunduh', false)
    await new Promise((r) => setTimeout(r, 800))
    await page.screenshot({ path: path.join(SHOTS, 'img-batch-webp.png') })

    check('Tanpa error JavaScript', errors.length === 0, errors.join(' | '))
  } finally {
    await browser.close()
    fs.rmSync(OUT, { recursive: true, force: true })
  }
  console.log(log.join('\n'))
}
run().catch((e) => {
  console.error('GAGAL', e)
  process.exit(1)
})

