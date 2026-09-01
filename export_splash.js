import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  // 1200x900 base size, 2x scale for high resolution -> 2400x1800
  await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 2 });
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
      body {
        font-family: 'Inter', sans-serif;
      }
    </style>
</head>
<body class="bg-white">
    <div class="fixed inset-0 bg-white flex items-center justify-center">
        <div class="relative flex items-center justify-center w-[600px] h-[600px]">
            
            <!-- Circular Connecting Dashed Line -->
            <svg class="absolute inset-0 w-full h-full -z-10 opacity-15" viewBox="0 0 600 600">
                <circle cx="300" cy="300" r="220" fill="none" stroke="#6366f1" stroke-width="3" stroke-dasharray="12 12" />
            </svg>

            <!-- Center Logo -->
            <div class="absolute z-10 flex flex-col items-center justify-center bg-white p-6 px-10 rounded-full">
                <div class="w-28 h-28 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-[0_25px_50px_-12px_rgba(99,102,241,0.5)] rotate-3">
                    <i data-lucide="trash-2" class="text-white w-14 h-14"></i>
                </div>
                <h1 class="mt-6 text-4xl font-black text-gray-900 tracking-tight">SwachhOS</h1>
                <p class="text-sm uppercase tracking-widest text-indigo-500 font-bold mt-2 text-center whitespace-nowrap">COMMAND CENTER FOR A CLEANER CITY</p>
            </div>

            <!-- Step 1: WhatsApp Received -->
            <div class="absolute flex flex-col items-center justify-center" style="transform: translate(0px, -220px);">
                <div class="w-20 h-20 rounded-[1.25rem] flex items-center justify-center shadow-lg bg-green-100 border-4 border-white">
                    <i data-lucide="message-circle" class="text-green-500 w-9 h-9"></i>
                </div>
                <span class="absolute top-24 left-1/2 -translate-x-1/2 text-center whitespace-nowrap text-lg font-bold text-gray-800 bg-white/90 px-3 py-1 rounded-lg shadow-sm border border-gray-100">
                    WhatsApp Received
                </span>
            </div>

            <!-- Step 2: Analysed -->
            <div class="absolute flex flex-col items-center justify-center" style="transform: translate(209.23px, -67.98px);">
                <div class="w-20 h-20 rounded-[1.25rem] flex items-center justify-center shadow-lg bg-blue-100 border-4 border-white">
                    <i data-lucide="bot" class="text-blue-500 w-9 h-9"></i>
                </div>
                <span class="absolute top-24 left-1/2 -translate-x-1/2 text-center whitespace-nowrap text-lg font-bold text-gray-800 bg-white/90 px-3 py-1 rounded-lg shadow-sm border border-gray-100">
                    Analysed
                </span>
            </div>

            <!-- Step 3: Ranking Produced -->
            <div class="absolute flex flex-col items-center justify-center" style="transform: translate(129.31px, 177.98px);">
                <div class="w-20 h-20 rounded-[1.25rem] flex items-center justify-center shadow-lg bg-orange-100 border-4 border-white">
                    <i data-lucide="bar-chart-2" class="text-orange-500 w-9 h-9"></i>
                </div>
                <span class="absolute top-24 left-1/2 -translate-x-1/2 text-center whitespace-nowrap text-lg font-bold text-gray-800 bg-white/90 px-3 py-1 rounded-lg shadow-sm border border-gray-100">
                    Ranking Produced
                </span>
            </div>

            <!-- Step 4: Coordinated Team -->
            <div class="absolute flex flex-col items-center justify-center" style="transform: translate(-129.31px, 177.98px);">
                <div class="w-20 h-20 rounded-[1.25rem] flex items-center justify-center shadow-lg bg-purple-100 border-4 border-white">
                    <i data-lucide="users" class="text-purple-500 w-9 h-9"></i>
                </div>
                <span class="absolute top-24 left-1/2 -translate-x-1/2 text-center whitespace-nowrap text-lg font-bold text-gray-800 bg-white/90 px-3 py-1 rounded-lg shadow-sm border border-gray-100">
                    Coordinated Team
                </span>
            </div>

            <!-- Step 5: Feedback -->
            <div class="absolute flex flex-col items-center justify-center" style="transform: translate(-209.23px, -67.98px);">
                <div class="w-20 h-20 rounded-[1.25rem] flex items-center justify-center shadow-lg bg-teal-100 border-4 border-white">
                    <i data-lucide="check-circle" class="text-teal-500 w-9 h-9"></i>
                </div>
                <span class="absolute top-24 left-1/2 -translate-x-1/2 text-center whitespace-nowrap text-lg font-bold text-gray-800 bg-white/90 px-3 py-1 rounded-lg shadow-sm border border-gray-100">
                    Feedback
                </span>
            </div>

        </div>
    </div>

    <script>
        lucide.createIcons();
    </script>
</body>
</html>
  `;
  
  await page.setContent(html);
  
  // Wait for Lucide script to process icons
  await page.evaluate(() => {
    return new Promise(resolve => {
      // wait slightly for the webfont/icons to render
      setTimeout(resolve, 500);
    });
  });

  const screenshotPath = path.resolve('swachhos-splash-illustration.png');
  await page.screenshot({ path: screenshotPath });
  await browser.close();
  console.log('Successfully generated high-res splash illustration at ' + screenshotPath);
})();
