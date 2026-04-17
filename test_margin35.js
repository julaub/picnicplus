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
        align-items: center;
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
        margin: auto;
    }
    </style>
    </head>
    <body>
    <div class="layout-centered" id="container">
        <div class="view-panel" id="panel">
            <h1 style="margin-top:0; padding-top: 50px;">align-items: center margin auto</h1>
            <div style="height: 1000px; background: linear-gradient(red, blue);">Content long</div>
        </div>
    </div>
    </body>
    </html>
  `);

  await page.evaluate(() => {
     document.getElementById('container').scrollTop = 0;
  });
  await new Promise(r => setTimeout(r, 100));
  await page.screenshot({ path: 'align_items_center_margin_auto.png' });

  await browser.close();
})();
