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

        // Show picnic view (short content)
        const views = document.querySelectorAll('.app-view');
        views.forEach(v => v.classList.remove('active', 'hidden'));
        views.forEach(v => {
            if(v.id !== 'view-picnic') v.classList.add('hidden');
        });
        document.getElementById('view-picnic').classList.add('active');
    });

    await page.screenshot({ path: 'test_mobile_picnic_short.png' });

    await page.evaluate(() => {
        const views = document.querySelectorAll('.app-view');
        views.forEach(v => v.classList.remove('active', 'hidden'));
        views.forEach(v => {
            if(v.id !== 'view-potluck') v.classList.add('hidden');
        });

        const potluckView = document.getElementById('view-potluck');
        potluckView.classList.add('active');
        const list = potluckView.querySelector('.potluck-list');
        if(list) {
            for (let i = 0; i < 50; i++) {
                const li = document.createElement('li');
                li.className = 'potluck-item';
                li.innerHTML = `<span class="item-name">Item ${i}</span>`;
                list.appendChild(li);
            }
        }
    });

    await page.screenshot({ path: 'test_mobile_potluck_long.png' });

    // Check potluck cutoff
    const isCutOff = await page.evaluate(() => {
        const layout = document.querySelector('#view-potluck');
        const panel = layout.querySelector('.view-panel');
        return {
            layoutScrollTop: layout.scrollTop,
            panelTop: panel.getBoundingClientRect().top,
            layoutTop: layout.getBoundingClientRect().top
        };
    });
    console.log("Positions before scrolling (long):", isCutOff);

    // Scroll potluck to bottom
    await page.evaluate(() => {
        const layout = document.querySelector('#view-potluck');
        layout.scrollTop = layout.scrollHeight;
    });
    await page.screenshot({ path: 'test_mobile_potluck_long_bottom.png' });

    await browser.close();
})();
