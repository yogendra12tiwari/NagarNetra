import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function capture() {
  const screenshotsDir = path.resolve(__dirname, '..', 'docs', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Launching Puppeteer browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // ── 1. Admin Command Center ──────────────────────────────────────────────
  console.log('Loading /admin...');
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle2' });

  // Wait for splash screen if present
  console.log('Waiting for splash screen...');
  await page.waitForFunction(() => !document.querySelector('.fixed.z-\\[9999\\]'), { timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  // Check if Admin Login bypass button is present
  const bypassBtn = await page.$('button::-p-text(Bypass Login)');
  if (bypassBtn) {
    console.log('Clicking Bypass Login button...');
    await bypassBtn.click();
    await new Promise(r => setTimeout(r, 2000));
  } else {
    // Try XPath or query selector
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Bypass Login')) {
        console.log('Found and clicking Bypass Login button via text loop...');
        await b.click();
        await new Promise(r => setTimeout(r, 2000));
        break;
      }
    }
  }

  // Wait for Sidebar / MapTab to mount
  console.log('Waiting for #tab-rawfeed to appear...');
  await page.waitForSelector('#tab-rawfeed', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000));

  // Screenshot 1: Command Center / Live Hazard Map
  console.log('Capturing command-center.png...');
  await page.screenshot({ path: path.join(screenshotsDir, 'command-center.png') });

  // Screenshot 2: Hazard Analytics (#tab-analysis)
  console.log('Switching to Hazard Analytics (#tab-analysis)...');
  await page.click('#tab-analysis');
  await new Promise(r => setTimeout(r, 2000));
  console.log('Capturing ai-risk-triage.png...');
  await page.screenshot({ path: path.join(screenshotsDir, 'ai-risk-triage.png') });

  // Screenshot 3: AI Risk & Triage / SLA Panel (#tab-insights)
  console.log('Switching to AI Risk & Triage (#tab-insights)...');
  await page.click('#tab-insights');
  await new Promise(r => setTimeout(r, 2000));
  console.log('Capturing municipal-insights-sla.png...');
  await page.screenshot({ path: path.join(screenshotsDir, 'municipal-insights-sla.png') });

  // Screenshot 4: Crew Coordination Panel (#tab-coordination)
  console.log('Switching to Crew Dispatch (#tab-coordination)...');
  await page.click('#tab-coordination');
  await new Promise(r => setTimeout(r, 2000));
  console.log('Capturing crew-coordination.png...');
  await page.screenshot({ path: path.join(screenshotsDir, 'crew-coordination.png') });

  // Screenshot 5: Citizen Verification / Repair Verification (#tab-feedback)
  console.log('Switching to Citizen Verification (#tab-feedback)...');
  await page.click('#tab-feedback');
  await new Promise(r => setTimeout(r, 2000));
  console.log('Capturing hazard-repair-verification.png...');
  await page.screenshot({ path: path.join(screenshotsDir, 'hazard-repair-verification.png') });

  // ── 2. Citizen Reporting Panel ───────────────────────────────────────────
  console.log('Loading Citizen Panel / ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => !document.querySelector('.fixed.z-\\[9999\\]'), { timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2500));

  console.log('Capturing citizen-reporting.png...');
  await page.screenshot({ path: path.join(screenshotsDir, 'citizen-reporting.png') });

  await browser.close();
  console.log('ALL 6 SCREENSHOTS CAPTURED SUCCESSFULLY in docs/screenshots!');
}

capture().catch(err => {
  console.error('Screenshot capture error:', err);
  process.exit(1);
});
