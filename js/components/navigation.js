// js/components/navigation.js

export const initializeNavigation = () => {
    const navButtons = document.querySelectorAll('.nav-btn');
    const appViews = document.querySelectorAll('.app-view');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');

            // Update button active state
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update views active state
            appViews.forEach(view => {
                if (view.id === targetId) {
                    view.classList.remove('hidden');
                    // Small delay to allow display to apply before fading in
                    setTimeout(() => {
                        view.classList.add('active');
                    }, 10);
                } else {
                    view.classList.remove('active');
                    // Only hide after transition finishes
                    setTimeout(() => {
                        if (!view.classList.contains('active')) {
                            view.classList.add('hidden');
                        }
                    }, 400); // 400ms matches the transition-bounce in css
                }
            });

            // Trigger map resize event if map view activated to fix Leaflet rendering issues
            if (targetId === 'view-map' && window.mapObj) {
                // Immediate call
                window.mapObj.invalidateSize();
                // Delayed call to ensure the map renders correctly after the CSS transition finishes
                setTimeout(() => window.mapObj.invalidateSize(), 500);
            }
        });
    });
};
