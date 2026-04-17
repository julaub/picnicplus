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
        const views = document.querySelectorAll('.app-view');
        views.forEach(v => v.classList.remove('active'));

        // Find a layout-centered view that exists
        const centeredView = document.querySelector('.layout-centered');
        if (centeredView) {
            centeredView.classList.add('active');
            const panel = centeredView.querySelector('.view-panel');
            if (panel) {
                const content = panel.querySelector('.view-content');
                if (content) {
                    for (let i = 0; i < 50; i++) {
                        const div = document.createElement('div');
                        div.innerHTML = `<p style="padding: 20px; border: 1px solid black;">Item ${i}</p>`;
                        content.appendChild(div);
                    }
                }
            }
        }
    });

    await page.screenshot({ path: 'test_overflow_top.png' });

    const isCutOff = await page.evaluate(() => {
        const layout = document.querySelector('.layout-centered.active');
        const panel = layout.querySelector('.view-panel');

        return {
            layoutScrollTop: layout.scrollTop,
            panelTop: panel.getBoundingClientRect().top,
            layoutTop: layout.getBoundingClientRect().top
        };
    });
    console.log("Positions before scrolling:", isCutOff);

    await browser.close();
})();
