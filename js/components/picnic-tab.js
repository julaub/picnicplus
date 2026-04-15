import { state } from '../state.js';

export const initPicnicTab = (containerId) => {
    const container = document.getElementById(containerId);
    const titleDisplay = document.getElementById('picnic-name-display');
    const navBtn = document.getElementById('nav-btn-picnic');

    if (!container || !titleDisplay || !navBtn) return;

    // Listen for state updates to re-render the dashboard
    window.addEventListener('stateUpdated', (e) => {
        if (!e.detail || e.detail.topic === 'all' || e.detail.topic === 'potluckItems') {
            renderDashboard();
        }
    });

    const renderDashboard = () => {
        if (!state.picnicId || !state.picnicDetails) {
            navBtn.style.display = 'none';
            return;
        }

        // Show the navigation button
        navBtn.style.display = 'flex';

        // Update header
        titleDisplay.textContent = state.picnicDetails.name || 'Your Picnic';

        // Calculate summary metrics
        const participantCount = state.participants ? state.participants.length : 0;
        const organizer = state.participants ? state.participants.find(p => p.role === 'organizer') : null;
        const organizerName = organizer ? organizer.name : 'Someone';

        const potluckCount = state.potluckItems ? state.potluckItems.length : 0;
        const claimedCount = state.potluckItems ? state.potluckItems.filter(i => i.status === 'covered').length : 0;

        const shareUrl = `${window.location.origin}${window.location.pathname}#picnic=${state.picnicId}`;

        // Render Cards
        container.innerHTML = `
            <div class="dashboard-grid">
                <!-- Location Card -->
                <div class="dashboard-card full-width" onclick="document.querySelector('.nav-btn[data-target=\\'view-map\\']').click()">
                    <div class="card-icon">📍</div>
                    <div class="card-title">Location</div>
                    <div class="card-value">View on Map</div>
                    <div class="card-subtext">Tap to see the exact spot</div>
                </div>

                <!-- Guests Card -->
                <div class="dashboard-card" onclick="document.querySelector('.nav-btn[data-target=\\'view-participants\\']').click()">
                    <div class="card-icon">👥</div>
                    <div class="card-title">Guests</div>
                    <div class="card-value">${participantCount} joining</div>
                    <div class="card-subtext">Organized by ${organizerName}</div>
                </div>

                <!-- Potluck Card Summary -->
                <div class="dashboard-card" onclick="document.querySelector('.nav-btn[data-target=\\'view-potluck\\']').click()">
                    <div class="card-icon">🍔</div>
                    <div class="card-title">Potluck Status</div>
                    <div class="card-value">${claimedCount} / ${potluckCount}</div>
                    <div class="card-subtext">items claimed</div>
                </div>

                <!-- Share Card -->
                <div class="dashboard-card full-width share-card" onclick="event.stopPropagation()">
                    <div class="card-title" style="color: var(--text-main);">🔗 Invite Friends</div>
                    <div class="card-subtext" style="color: rgba(255,255,255,0.7);">Share this secret link to invite others:</div>
                    <div class="share-input-group">
                        <input type="text" value="${shareUrl}" readonly id="share-url-input">
                        <button class="btn-primary" id="copy-share-btn">Copy</button>
                    </div>
                </div>
            </div>
            
            <!-- Potluck Items List on Dashboard -->
            <div class="dashboard-section mt-4" style="margin-top: 2rem;">
                <h3 style="margin-bottom: 1rem; color: var(--text-light); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">Potluck Items List</h3>
                <ul class="potluck-list mini" style="list-style: none; padding: 0; margin: 0;">
                    ${(!state.potluckItems || state.potluckItems.length === 0)
                ? '<li style="color: var(--text-muted); padding: 10px 0;">No items added yet.</li>'
                : state.potluckItems.map(item => {
                    const isCovered = item.status === 'covered';
                    const claimerName = isCovered
                        ? (state.currentUser && item.claimedBy.id === state.currentUser.id ? 'You' : item.claimedBy.name)
                        : 'Needed';
                    return `
                                <li class="potluck-item mini-item flex-between" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                    <span class="item-name ${isCovered ? 'strike-through' : ''}" style="${isCovered ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${item.name}</span>
                                    <span class="badge" style="font-size: 0.85rem; padding: 4px 8px; border-radius: 12px; ${isCovered ? 'background: rgba(16, 185, 129, 0.2); color: #10b981;' : 'background: rgba(245, 158, 11, 0.2); color: #f59e0b;'}">${isCovered ? '✅ ' + claimerName : 'Needed'}</span>
                                </li>
                            `;
                }).join('')
            }
                </ul>
                <button class="btn-secondary full-width mt-4" style="margin-top: 1rem; width: 100%;" onclick="document.querySelector('.nav-btn[data-target=\\'view-potluck\\']').click()">Manage Potluck Items</button>
            </div>
        `;

        // Add copy handler
        const copyBtn = document.getElementById('copy-share-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const input = document.getElementById('share-url-input');

                navigator.clipboard.writeText(input.value)
                    .then(() => {
                        const originalText = copyBtn.textContent;
                        copyBtn.textContent = 'Copied!';
                        copyBtn.style.background = 'var(--success-color, #10b981)';

                        setTimeout(() => {
                            copyBtn.textContent = originalText;
                            copyBtn.style.background = '';
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Failed to copy text: ', err);
                    });
            });
        }
    };

    // Initial render attempt in case state is already populated
    renderDashboard();
};
