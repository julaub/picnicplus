import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  await page.setViewport({ width: 375, height: 667, isMobile: true });

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
    <style>
    body { margin: 0; }
    .layout-centered {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 20px;
        padding-bottom: 100px;
        background: radial-gradient(circle at center, #333, #000);
        overflow-y: auto;
        height: 667px;
        box-sizing: border-box;
    }

    .view-panel {
        width: 100%;
        max-width: 600px;
        border-radius: 20px;
        background: #fff;
        display: flex;
        flex-direction: column;
        min-height: 50vh;
        /* we remove margin: auto */
        margin: auto;
        /* To prioritize user experience, margin: auto combined with align-items: flex-start fixes the issue on mobile BUT it breaks vertical centering of short content because align-items is flex-start! Wait, margin: auto vertically centers it in flexbox regardless of align-items IF there's extra space! Let's check this! */
    }
    </style>
    </head>
    <body>
    <div class="layout-centered" id="container">
        <div class="view-panel" id="panel" style="height: 100px; min-height: 100px;">
            <h1 style="margin-top:0; padding-top: 50px;">flex-start margin auto</h1>
        </div>
    </div>
    </body>
    </html>
  `);

  await page.evaluate(() => {
     document.getElementById('container').scrollTop = 0;
  });
  await new Promise(r => setTimeout(r, 100));
  await page.screenshot({ path: 'flex_start_margin_auto_short.png' });

  await browser.close();
})();
