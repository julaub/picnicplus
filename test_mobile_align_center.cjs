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
                align-items: center; /* Intentionally set to center to test */
                justify-content: center;
                height: 100vh;
                overflow-y: auto;
            }
            .view-panel {
                width: 100%;
                min-height: 100%; /* As in mobile */
                margin: 0; /* As in mobile */
            }
            .content {
                height: 1500px;
                background: linear-gradient(to bottom, red, blue);
            }
        </style>
        <div class="layout-centered">
            <div class="view-panel">
                <div class="content">Content</div>
            </div>
        </div>
    `);

    const bounds = await page.evaluate(() => {
        const layout = document.querySelector('.layout-centered');
        const panel = document.querySelector('.view-panel');
        return {
            layoutTop: layout.getBoundingClientRect().top,
            panelTop: panel.getBoundingClientRect().top,
            scrollTop: layout.scrollTop
        };
    });
    console.log("Align Center bounds:", bounds);

    await browser.close();
})();
