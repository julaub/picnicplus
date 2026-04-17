const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 375, height: 667 }
    });
    const page = await browser.newPage();

    // Serve from localhost
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    // Inject long content into a layout-centered view (e.g. potluck view)
    await page.evaluate(() => {
        const views = document.querySelectorAll('.app-view');
        views.forEach(v => v.classList.remove('active'));

        const potluckView = document.getElementById('potluck-view');
        potluckView.classList.add('active');

        // Add a ton of items to the potluck list to cause overflow
        const list = potluckView.querySelector('.potluck-list');
        for (let i = 0; i < 50; i++) {
            const li = document.createElement('li');
            li.className = 'potluck-item';
            li.innerHTML = `
                <div class="item-details">
                    <span class="item-name">Item ${i}</span>
                </div>
            `;
            list.appendChild(li);
        }
    });

    await page.screenshot({ path: 'test_overflow_top.png' });

    // Try to scroll to see if the top is cut off
    const isCutOff = await page.evaluate(() => {
        const layout = document.querySelector('.layout-centered.active');
        const panel = layout.querySelector('.view-panel');

        // Return details about positions
        return {
            layoutScrollTop: layout.scrollTop,
            panelTop: panel.getBoundingClientRect().top,
            layoutTop: layout.getBoundingClientRect().top
        };
    });
    console.log("Positions before scrolling:", isCutOff);

    // Scroll down 100px
    await page.evaluate(() => {
        document.querySelector('.layout-centered.active').scrollTop = 100;
    });
    await page.screenshot({ path: 'test_overflow_scrolled.png' });

    // Scroll to the very bottom
    await page.evaluate(() => {
        const layout = document.querySelector('.layout-centered.active');
        layout.scrollTop = layout.scrollHeight;
    });
    await page.screenshot({ path: 'test_overflow_bottom.png' });

    await browser.close();
})();
