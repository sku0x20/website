const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
  });
  const page = await browser.newPage();
  await page.goto('file://' + path.join(__dirname, 'resume.html'), { waitUntil: 'networkidle0' });
  await page.pdf({
    path: path.join(__dirname, '..', 'public', 'resume.pdf'),
    format: 'Letter',
    printBackground: true,
    // Real per-page margins — not container padding, which only shows
    // at the true start/end of the flowed content, not at page breaks.
    margin: { top: '0.7in', bottom: '0.7in', left: '0.65in', right: '0.65in' },
  });
  await browser.close();
})();
