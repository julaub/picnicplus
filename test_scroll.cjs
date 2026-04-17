const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 375, height: 667 } // Mobile viewport
    });
    const page = await browser.newPage();

    await page.setContent(`
        <style>
            :root {
                --bg-dark: #222;
                --radius-lg: 16px;
            }
            body { margin: 0; height: 100vh; }
            .layout-centered {
                display: flex;
                align-items: flex-start;
                justify-content: center;
                padding: 0;
                padding-bottom: 90px;
                background: radial-gradient(circle at center, var(--bg-dark), #000);
                overflow-y: auto;
                height: 100vh;
                box-sizing: border-box;
            }
            .view-panel {
                width: 100%;
                max-width: 100%;
                border-radius: 0;
                display: flex;
                flex-direction: column;
                min-height: 100%;
                margin: 0;
                background: white;
            }
            .content-block {
                height: 400px;
                border: 1px solid black;
            }
        </style>
        <div class="layout-centered">
            <div class="view-panel">
                <div style="background:red" class="content-block">Top</div>
                <div style="background:yellow" class="content-block">Middle</div>
                <div style="background:blue" class="content-block">Bottom</div>
            </div>
        </div>
    `);

    await page.screenshot({ path: 'test_mobile_render_start.png' });

    // Check if scrollTop is 0 and if top is visible
    const topVisible = await page.evaluate(() => {
        const panel = document.querySelector('.layout-centered');
        return panel.scrollTop === 0;
    });

    console.log("Is scrollTop 0 initially?", topVisible);

    await page.evaluate(() => {
        document.querySelector('.layout-centered').scrollTop = 100;
    });
    await page.screenshot({ path: 'test_mobile_render_100.png' });

    await browser.close();
})();
