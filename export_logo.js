import puppeteer from 'puppeteer';
import fs from 'fs';

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
  
  await page.setContent(html);
  await page.screenshot({ path: 'swachhos-logo-highres.png', omitBackground: true });
  await browser.close();
  console.log('Successfully generated high-res logo at swachhos-logo-highres.png');
})();
