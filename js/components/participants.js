// js/components/participants.js
import { state } from '../state.js';

export const initParticipants = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const render = () => {
        let html = '<ul class="potluck-list">'; // Reusing list style

        state.participants.forEach(p => {
            const isMe = state.currentUser && p.id === state.currentUser.id;
            const roleBadge = p.role === 'organizer'
                ? '<span class="claimed-badge" style="background: rgba(0, 210, 255, 0.2); color: var(--primary);">👑 Organizer</span>'
                : '';

            html += `
                <li class="potluck-item fade-in">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 24px;">${p.avatar || '👤'}</span>
                        <div>
                            <span class="item-name">${p.name} ${isMe ? '(You)' : ''}</span>
                        </div>
                    </div>
                    ${roleBadge}
                </li>
            `;
        });

        html += '</ul>';

        // Add invite button if picnic exists
        if (state.picnicId) {
            html += `
                <div class="mt-4" style="text-align: center;">
                    <button class="btn-primary" style="margin: 0 auto; width: auto; padding: 10px 24px;" onclick="navigator.clipboard.writeText(window.location.href); alert('Link copied!');">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="btn-icon-svg"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                        Copy Invite Link
                    </button>
                </div>
            `;
        } else {
            html += `
                <div class="mt-4" style="text-align: center; color: var(--text-muted);">
                    Select a location on the map to create a picnic and invite friends.
                </div>
            `;
        }

        container.innerHTML = html;
    };

    render();

    // Listen for state changes
    window.addEventListener('stateUpdated', (e) => {
        if (e.detail.topic === 'participants' || e.detail.topic === 'all') render();
    });
};
