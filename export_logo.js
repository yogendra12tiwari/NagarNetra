import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 2048, height: 2048, deviceScaleFactor: 2 });
  
  // The favicon.svg content
  const svgContent = fs.readFileSync('./public/favicon.svg', 'utf8');
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: transparent;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            width: 100vw;
          }
          svg {
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
    </html>
  `;
  
  const logoPath = path.join('assets', 'nagarnetra-logo-highres.png');
  await page.screenshot({ path: logoPath, omitBackground: true });
  await browser.close();
  console.log('Successfully generated high-res logo at ' + logoPath);
})();
