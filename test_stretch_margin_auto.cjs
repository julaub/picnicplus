const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 375, height: 667 }
    });
    const page = await browser.newPage();

    await page.setContent(`
        <style>
            body { margin: 0; height: 100vh; }
            .layout-centered {
                display: flex;
                /* No align-items, defaults to stretch */
                justify-content: center;
                height: 100vh;
                background: #eee;
                overflow-y: auto;
            }
            .view-panel {
                width: 300px;
                background: red;
                margin: auto; /* Vertically and horizontally center */
            }
            .short { height: 200px; }
            .long { height: 1500px; }
        </style>
        <div class="layout-centered" id="short-layout">
            <div class="view-panel short">Short Content</div>
        </div>
        <div class="layout-centered" id="long-layout" style="display:none;">
            <div class="view-panel long">Long Content</div>
        </div>
    `);

    // Check short
    const shortBounds = await page.evaluate(() => {
        const panel = document.querySelector('.short');
        const rect = panel.getBoundingClientRect();
        return { top: rect.top, height: rect.height };
    });
    console.log("Short panel bounds:", shortBounds);

    // Check long
    await page.evaluate(() => {
        document.getElementById('short-layout').style.display = 'none';
        document.getElementById('long-layout').style.display = 'flex';
    });
    const longBounds = await page.evaluate(() => {
        const panel = document.querySelector('.long');
        const rect = panel.getBoundingClientRect();
        const layout = document.querySelector('#long-layout');
        return { top: rect.top, height: rect.height, scrollTop: layout.scrollTop };
    });
    console.log("Long panel bounds:", longBounds);

    await browser.close();
})();
