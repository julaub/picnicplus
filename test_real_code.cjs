const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 375, height: 667 } // Mobile viewport
    });
    const page = await browser.newPage();

    // We serve the app on localhost:3000
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    // Show a view with overflowing content on mobile
    await page.evaluate(() => {
        // Find view-panel and populate with long content
        const panel = document.querySelector('.view-panel');
        if(panel) {
            panel.innerHTML = `
                <div class="view-header" style="background: red;"><h2>Test View Top</h2></div>
                <div class="view-content">
                    <p style="height: 1000px; background: yellow;">Middle Content</p>
                    <p style="height: 100px; background: blue;">Bottom Content</p>
                </div>
            `;
        }
        // Force the app-view to be active
        const views = document.querySelectorAll('.app-view');
        views.forEach(v => {
            if(v.classList.contains('layout-centered')) {
                v.classList.add('active');
            } else {
                v.classList.remove('active');
            }
        });
    });

    await page.screenshot({ path: 'test_real_mobile_start.png' });

    const topVisible = await page.evaluate(() => {
        const layoutCentered = document.querySelector('.layout-centered.active');
        return layoutCentered.scrollTop === 0;
    });

    console.log("Is scrollTop 0 initially?", topVisible);

    // Scroll to see if we can reach the top
    await page.evaluate(() => {
        const layoutCentered = document.querySelector('.layout-centered.active');
        layoutCentered.scrollTop = 50;
    });
    await page.screenshot({ path: 'test_real_mobile_50.png' });

    // Check if margin is 0 or auto
    const margin = await page.evaluate(() => {
        const panel = document.querySelector('.view-panel');
        return window.getComputedStyle(panel).margin;
    });
    console.log("Panel margin:", margin);

    await browser.close();
})();
