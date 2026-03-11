// js/components/participants.js
import { state } from '../state.js';

export const initParticipants = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const render = () => {
        container.innerHTML = '';
        const ul = document.createElement('ul');
        ul.className = 'potluck-list';

        state.participants.forEach(p => {
            const isMe = state.currentUser && p.id === state.currentUser.id;
            
            const li = document.createElement('li');
            li.className = 'potluck-item fade-in';

            const flexDiv = document.createElement('div');
            flexDiv.style.cssText = 'display: flex; align-items: center; gap: 12px;';

            const avatarSpan = document.createElement('span');
            avatarSpan.style.fontSize = '24px';
            avatarSpan.textContent = p.avatar || '👤';

            const nameDiv = document.createElement('div');
            const nameSpan = document.createElement('span');
            nameSpan.className = 'item-name';
            nameSpan.textContent = `${p.name} ${isMe ? '(You)' : ''}`;

            nameDiv.appendChild(nameSpan);
            flexDiv.appendChild(avatarSpan);
            flexDiv.appendChild(nameDiv);
            li.appendChild(flexDiv);

            if (p.role === 'organizer') {
                const roleBadge = document.createElement('span');
                roleBadge.className = 'claimed-badge';
                roleBadge.style.cssText = 'background: rgba(0, 210, 255, 0.2); color: var(--primary);';
                roleBadge.textContent = '👑 Organizer';
                li.appendChild(roleBadge);
            }

            ul.appendChild(li);
        });

        // Add invite button if picnic exists
        container.appendChild(ul);
        if (state.picnicId) {
            const inviteDiv = document.createElement('div');
            inviteDiv.className = 'mt-4';
            inviteDiv.style.textAlign = 'center';
            inviteDiv.innerHTML = `
                    <button class="btn-primary" style="margin: 0 auto; width: auto; padding: 10px 24px;" onclick="navigator.clipboard.writeText(window.location.href); alert('Link copied!');">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="btn-icon-svg"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                        Copy Invite Link
                    </button>
            `;
            container.appendChild(inviteDiv);
        } else {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'mt-4';
            emptyDiv.style.cssText = 'text-align: center; color: var(--text-muted);';
            emptyDiv.textContent = 'Select a location on the map to create a picnic and invite friends.';
            container.appendChild(emptyDiv);
        }
    };

    render();

    // Listen for state changes
    window.addEventListener('stateUpdated', (e) => {
        if (e.detail.topic === 'participants' || e.detail.topic === 'all') render();
    });
};
