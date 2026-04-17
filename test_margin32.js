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
        /* We can fix top content being cut off while maintaining vertical centering by wrapping it! */
        justify-content: center;
        padding: 0;
        padding-bottom: 90px;
        background: #333;
        overflow-y: auto;
        height: 667px;
        box-sizing: border-box;
    }

    .view-panel {
        background: #fff;
        width: 100%;
        max-width: 100%;
        min-height: 100%;
        /* Change from margin: auto to margin: 0 auto; on mobile it's already 0 */
        margin: auto;
    }

    /* Better fix: */
    .layout-centered-fixed {
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        padding: 20px;
        padding-bottom: 100px;
        background: #333;
        overflow-y: auto;
        height: 667px;
        box-sizing: border-box;
    }

    .view-panel-fixed {
        background: #fff;
        width: 100%;
        max-width: 600px;
        min-height: 50vh;
        /* use margin-top: auto and margin-bottom: auto but ONLY if they don't break flex */
        /* Actually, in flexbox, margin: auto consumes available space. If there's negative space, it centers it, cutting off BOTH top and bottom equally!
           To fix this, we change margin: auto to margin: 0 auto; and we use flex-start. But we lose vertical centering for short content.

           Wait, there is a trick!
           margin: auto auto;
           margin-top: auto; margin-bottom: auto;

           If we only want to push it down from top when there's space, we can just use `margin-top: auto; margin-bottom: auto;`
           BUT it still cuts off when overflowing.

           The modern CSS way is: `margin: 0 auto;` on the child, and on the parent `align-items: center;` -> cuts off top.
           `align-items: safe center;` -> doesn't cut off top, centers if space! But Safari support might be spotty.

           Another way:
           Set parent to display: grid; place-items: center;
           When content is larger than container, grid also cuts it off unless we use safe center.

           Let's see what happens if we use margin: auto on the child, BUT wrap the child in a block container.
        */
        margin: 0 auto;
    }
    </style>
    </head>
    <body>
    <div class="layout-centered-fixed" id="container">
        <div class="view-panel-fixed" id="panel">
            <h1 style="margin-top:0; padding-top: 50px;">margin 0 auto</h1>
            <div style="height: 1000px; background: linear-gradient(red, blue);">Content short</div>
        </div>
    </div>
    </body>
    </html>
  `);

  await page.evaluate(() => {
     document.getElementById('container').scrollTop = 0;
  });
  await new Promise(r => setTimeout(r, 100));
  await page.screenshot({ path: 'mobile_margin_0_auto_long_top_padding.png' });

  await browser.close();
})();
