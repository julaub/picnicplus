const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1024, height: 768 } // Desktop viewport
    });
    const page = await browser.newPage();

    await page.setContent(`
        <style>
            body { margin: 0; height: 100vh; }
            .layout-centered {
                display: flex;
                align-items: flex-start;
                justify-content: center;
                height: 100vh;
                background: #eee;
            }
            .view-panel {
                width: 400px;
                height: 200px;
                margin: auto;
                background: red;
            }
        </style>
        <div class="layout-centered">
            <div class="view-panel"></div>
        </div>
    `);

    // Evaluate if the panel is centered
    const bounds = await page.evaluate(() => {
        const panel = document.querySelector('.view-panel');
        const rect = panel.getBoundingClientRect();
        return { top: rect.top, height: rect.height };
    });
    console.log("Panel bounds:", bounds);

    await browser.close();
})();
