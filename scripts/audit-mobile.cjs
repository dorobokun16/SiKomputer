const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = 'https://localhost:4173';
const SHOTS = path.resolve('C:/Users/Iwan Kurniawan/.gemini/antigravity/brain/e628cb17-2b23-4e08-a146-48d62ef79dd4/scratch/mobile_audit');
fs.mkdirSync(SHOTS, { recursive: true });

async function auditMobile() {
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

    const routes = [
      { path: '/', name: '01-dashboard' },
      { path: '/dev/base64', name: '02-base64' },
      { path: '/dev/pdf-repair', name: '03-pdf-repair' },
      { path: '/dev/image-studio', name: '04-image-studio' },
      { path: '/dev/spreadsheet', name: '05-spreadsheet' },
      { path: '/dev/rpa-monitoring', name: '06-rpa-monitoring' },
      { path: '/dev/api-tester', name: '07-api-tester' },
      { path: '/productivity/tasks', name: '08-tasks' },
      { path: '/productivity/backlog', name: '09-backlog' },
      { path: '/productivity/reminders', name: '10-reminders' },
      { path: '/productivity/notes', name: '11-notes' },
      { path: '/productivity/date-calc', name: '12-date-calc' },
      { path: '/tools/toolbox', name: '13-toolbox' },
      { path: '/tools/vault', name: '14-vault' },
      { path: '/settings', name: '15-settings' },
    ];

    for (const r of routes) {
      await page.goto(`${BASE}${r.path}`, { waitUntil: 'networkidle0' });
      await new Promise((res) => setTimeout(res, 500));

      const metrics = await page.evaluate(() => {
        const vw = window.innerWidth;
        const sw = document.documentElement.scrollWidth;
        const bw = document.body.scrollWidth;
        const overflowers = [];
        const all = document.querySelectorAll('*');
        for (const el of all) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.right > vw + 2) {
            // Check whether ancestor has overflow-x-auto or overflow-hidden
            let cur = el.parentElement;
            let insideScrollContainer = false;
            while (cur && cur !== document.body) {
              const st = getComputedStyle(cur);
              if (st.overflowX === 'auto' || st.overflowX === 'scroll' || st.overflowX === 'hidden') {
                insideScrollContainer = true;
                break;
              }
              cur = cur.parentElement;
            }
            if (!insideScrollContainer) {
              overflowers.push({
                tag: el.tagName,
                cls: (el.className || '').toString().slice(0, 60),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
                text: (el.innerText || '').trim().slice(0, 30),
              });
            }
          }
        }
        return { vw, sw, bw, overflowCount: overflowers.length, topOverflowers: overflowers.slice(0, 5) };
      });

      console.log(`${r.name.padEnd(20)} | sw=${metrics.sw} vw=${metrics.vw} | uncontainedOverflow=${metrics.overflowCount}`);
      if (metrics.topOverflowers.length > 0) {
        console.log('   Overflowers:', JSON.stringify(metrics.topOverflowers));
      }
      await page.screenshot({ path: path.join(SHOTS, `${r.name}.png`), fullPage: false });
    }

    // Also test Dev Toolbox SQL Generator + Text Replace on mobile
    await page.goto(`${BASE}/tools/toolbox`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('SQL Generator'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: path.join(SHOTS, '16-toolbox-sql.png') });
    const sqlSw = await page.evaluate(() => document.documentElement.scrollWidth);
    console.log('16-toolbox-sql       | sw=' + sqlSw + ' vw=375');

    // Also test Settings -> PWA tab on mobile
    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('PWA & Akses'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: path.join(SHOTS, '17-settings-pwa.png') });
  } finally {
    await browser.close();
  }
}

auditMobile().catch((e) => {
  console.error(e);
  process.exit(1);
});
