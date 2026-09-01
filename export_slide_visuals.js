import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const slides = [
  {
    name: 'slide1_problems',
    icons: [
      { id: 'trending-down', color: 'text-red-500', bg: 'bg-red-100', angle: -90 },
      { id: 'package-x', color: 'text-orange-500', bg: 'bg-orange-100', angle: 150 },
      { id: 'unlink', color: 'text-gray-500', bg: 'bg-gray-100', angle: 30 }
    ]
  },
  {
    name: 'slide2_solutions',
    icons: [
      { id: 'map', color: 'text-blue-500', bg: 'bg-blue-100', angle: -90 },
      { id: 'message-square', color: 'text-green-500', bg: 'bg-green-100', angle: 150 },
      { id: 'shield-check', color: 'text-teal-500', bg: 'bg-teal-100', angle: 30 }
    ]
  },
  {
    name: 'slide3_usp',
    icons: [
      { id: 'refresh-cw', color: 'text-emerald-500', bg: 'bg-emerald-100', angle: 180 },
      { id: 'layout-dashboard', color: 'text-violet-500', bg: 'bg-violet-100', angle: 0 }
    ]
  },
  {
    name: 'slide4_workflow',
    icons: [
      { id: 'message-circle', color: 'text-green-500', bg: 'bg-green-100', angle: -90 },
      { id: 'bot', color: 'text-blue-500', bg: 'bg-blue-100', angle: -18 },
      { id: 'bar-chart-2', color: 'text-orange-500', bg: 'bg-orange-100', angle: 54 },
      { id: 'users', color: 'text-purple-500', bg: 'bg-purple-100', angle: 126 },
      { id: 'check-circle', color: 'text-teal-500', bg: 'bg-teal-100', angle: 198 }
    ]
  },
  {
    name: 'slide5_techstack',
    icons: [
      { id: 'sparkles', color: 'text-amber-500', bg: 'bg-amber-100', angle: -90 },
      { id: 'hexagon', color: 'text-cyan-500', bg: 'bg-cyan-100', angle: 150 },
      { id: 'server', color: 'text-indigo-500', bg: 'bg-indigo-100', angle: 30 }
    ]
  },
  {
    name: 'slide6_impact',
    icons: [
      { id: 'piggy-bank', color: 'text-green-500', bg: 'bg-green-100', angle: -90 },
      { id: 'handshake', color: 'text-blue-500', bg: 'bg-blue-100', angle: 150 },
      { id: 'smartphone', color: 'text-pink-500', bg: 'bg-pink-100', angle: 30 }
    ]
  },
  {
    name: 'slide7_try_it',
    icons: [
      { id: 'rocket', color: 'text-rose-500', bg: 'bg-rose-100', angle: -90 },
      { id: 'qr-code', color: 'text-emerald-500', bg: 'bg-emerald-100', angle: 150 },
      { id: 'globe', color: 'text-cyan-500', bg: 'bg-cyan-100', angle: 30 }
    ]
  }
];

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // 1:1 aspect ratio, perfectly tight bounding box around the 600px container
  await page.setViewport({ width: 600, height: 600, deviceScaleFactor: 2 });
  
  for (const slide of slides) {
    const radius = 210; // Slightly smaller to ensure icons don't touch the very edges of 600px
    
    // Generate icons HTML
    const iconsHtml = slide.icons.map(iconObj => {
      const rad = iconObj.angle * (Math.PI / 180);
      const x = Math.cos(rad) * radius;
      const y = Math.sin(rad) * radius;
      
      return '<div class="absolute flex flex-col items-center justify-center" style="transform: translate(' + x + 'px, ' + y + 'px);">' +
             '  <div class="w-24 h-24 rounded-[1.5rem] flex items-center justify-center shadow-lg ' + iconObj.bg + ' border-4 border-white">' +
             '    <i data-lucide="' + iconObj.id + '" class="' + iconObj.color + ' w-10 h-10"></i>' +
             '  </div>' +
             '</div>';
    }).join('');

    const html = '<!DOCTYPE html>' +
                 '<html lang="en">' +
                 '<head>' +
                 '    <meta charset="UTF-8">' +
                 '    <script src="https://cdn.tailwindcss.com"></script>' +
                 '    <script src="https://unpkg.com/lucide@latest"></script>' +
                 '</head>' +
                 '<body class="bg-white m-0 p-0 overflow-hidden w-[600px] h-[600px]">' +
                 '    <div class="relative flex items-center justify-center w-[600px] h-[600px]">' +
                 '        <!-- Circular Connecting Dashed Line -->' +
                 '        <svg class="absolute inset-0 w-full h-full -z-10 opacity-15" viewBox="0 0 600 600">' +
                 '            <circle cx="300" cy="300" r="' + radius + '" fill="none" stroke="#6366f1" stroke-width="3" stroke-dasharray="12 12" />' +
                 '        </svg>' +
                 '        <!-- Center Logo -->' +
                 '        <div class="absolute z-10 flex items-center justify-center bg-white p-6 rounded-full">' +
                 '            <div class="w-32 h-32 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-[0_25px_50px_-12px_rgba(99,102,241,0.5)] rotate-3">' +
                 '                <i data-lucide="trash-2" class="text-white w-16 h-16"></i>' +
                 '            </div>' +
                 '        </div>' +
                 '        <!-- Icons -->' +
                 iconsHtml +
                 '    </div>' +
                 '    <script>lucide.createIcons();</script>' +
                 '</body>' +
                 '</html>';
    
    await page.setContent(html);
    
    // Wait for Lucide icons to render
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));

    const screenshotPath = path.resolve(slide.name + ".png");
    await page.screenshot({ path: screenshotPath });
    console.log('Generated:', screenshotPath);
  }
  
  await browser.close();
})();
