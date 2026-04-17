const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 375, height: 667 } // Mobile viewport
    });
    const page = await browser.newPage();

    const htmlTemplate = (margin, minHeight, contentHeight) => `
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
                min-height: ${minHeight};
                margin: ${margin};
                background: white;
            }
            .content-block {
                height: ${contentHeight}px;
                border: 1px solid black;
            }
        </style>
        <div class="layout-centered">
            <div class="view-panel">
                <div style="background:red" class="content-block">Content</div>
            </div>
        </div>
    `;

    // 1. Current Mobile Behavior (Short Content)
    await page.setContent(htmlTemplate('0', '100%', 200));
    await page.screenshot({ path: 'test_mobile_current_short.png' });

    // 2. Proposed Mobile Behavior (Short Content)
    await page.setContent(htmlTemplate('auto', 'auto', 200));
    await page.screenshot({ path: 'test_mobile_proposed_short.png' });

    // 3. Proposed Mobile Behavior (Long Content)
    await page.setContent(htmlTemplate('auto', 'auto', 1200));
    await page.screenshot({ path: 'test_mobile_proposed_long.png' });

    // Scroll the long content to see if the top is cut off
    const topVisible = await page.evaluate(() => {
        const panel = document.querySelector('.layout-centered');
        return panel.scrollTop === 0;
    });
    console.log("Is scrollTop 0 initially for long content?", topVisible);

    await browser.close();
})();
