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
        /* Fixes top content being cut off when scrolling on mobile */
        justify-content: center;
        padding: 20px;
        padding-bottom: 100px;
        /* Space for bottom nav */
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
        /* We can change margin: auto to margin: auto auto; ? Wait, auto does vertical and horizontal if it's a shorthand!
           Let's change to margin: 0 auto; on desktop to see if it fixes overflow issue without breaking small content.
           If we use margin: 0 auto; it stays at top.
        */
        margin: auto;
    }
    </style>
    </head>
    <body>
    <div class="layout-centered" id="container">
        <div class="view-panel" id="panel">
            <h1 style="margin-top:0; padding-top: 50px;">Desktop-like margin auto</h1>
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
  await page.screenshot({ path: 'desktop_flex_start_margin_auto_long_top.png' });

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
        /* Change to margin: auto; but wrapped */
    }
    .panel-wrapper {
       display: flex;
       flex-direction: column;
       justify-content: center;
       min-height: 100%;
       width: 100%;
    }
    </style>
    </head>
    <body>
    <div class="layout-centered" id="container">
        <div class="panel-wrapper">
            <div class="view-panel" id="panel">
                <h1 style="margin-top:0; padding-top: 50px;">Desktop-like wrapper</h1>
                <div style="height: 1000px; background: linear-gradient(red, blue);">Content long</div>
            </div>
        </div>
    </div>
    </body>
    </html>
  `);

  await page.evaluate(() => {
     document.getElementById('container').scrollTop = 0;
  });
  await new Promise(r => setTimeout(r, 100));
  await page.screenshot({ path: 'desktop_wrapper_long_top.png' });

  await browser.close();
})();
