const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 375, height: 667 }
    });
    const page = await browser.newPage();

    // Serve from localhost
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    await page.evaluate(() => {
        // Change views.css rules dynamically
        const style = document.createElement('style');
        style.innerHTML = `
            @media (max-width: 768px) {
                .view-panel {
                    margin: auto !important;
                    min-height: auto !important;
                }
            }
        `;
        document.head.appendChild(style);

        // Ensure potluck view is hidden, about view is visible (short content)
        const views = document.querySelectorAll('.app-view');
        views.forEach(v => v.classList.remove('active'));

        const aboutView = document.getElementById('about-view');
        if(aboutView) aboutView.classList.add('active');
    });

    await page.screenshot({ path: 'test_mobile_auto_short.png' });

    await page.evaluate(() => {
        const views = document.querySelectorAll('.app-view');
        views.forEach(v => v.classList.remove('active'));

        const potluckView = document.getElementById('potluck-view');
        if(potluckView) {
            potluckView.classList.add('active');
            const list = potluckView.querySelector('.potluck-list');
            for (let i = 0; i < 50; i++) {
                const li = document.createElement('li');
                li.className = 'potluck-item';
                li.innerHTML = `<span class="item-name">Item ${i}</span>`;
                list.appendChild(li);
            }
        }
    });

    await page.screenshot({ path: 'test_mobile_auto_long.png' });

    await browser.close();
})();
