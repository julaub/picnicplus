const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 375, height: 667 } // Mobile viewport
    });
    const page = await browser.newPage();

    // We serve the app on localhost:3000
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    // Open a view that uses layout-centered and has overflowing content.
    // Let's modify the DOM to add lots of content to one of the views, say "about" or "potluck"
    await page.evaluate(() => {
        const panel = document.createElement('div');
        panel.className = 'app-view active layout-centered';
        panel.id = 'test-view';
        panel.innerHTML = `
            <div class="view-panel">
                <div class="view-header"><h2>Test View</h2></div>
                <div class="view-content">
                    <p style="height: 100px; background: red;">Top Content</p>
                    <p style="height: 800px; background: yellow;">Middle Content</p>
                    <p style="height: 100px; background: blue;">Bottom Content</p>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
    });

    await page.screenshot({ path: 'test_mobile_scroll_initial.png' });

    // Scroll down to see if top is accessible
    await page.evaluate(() => {
        const centered = document.querySelector('#test-view');
        centered.scrollTop = 50;
    });
    await page.screenshot({ path: 'test_mobile_scroll_50.png' });

    await browser.close();
})();
