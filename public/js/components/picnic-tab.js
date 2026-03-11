import { state, proposeDateApi, toggleVoteApi } from '../state.js';
import { requestDateAndTime } from './date-picker.js';

export const initPicnicTab = (containerId) => {
    const container = document.getElementById(containerId);
    const titleDisplay = document.getElementById('picnic-name-display');
    const navBtn = document.getElementById('nav-btn-picnic');

    if (!container || !titleDisplay || !navBtn) return;

    // Listen for state updates to re-render the dashboard
    window.addEventListener('stateUpdated', (e) => {
        if (!e.detail || e.detail.topic === 'all' || e.detail.topic === 'potluckItems' || e.detail.topic === 'dates') {
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

        container.innerHTML = '';

        const gridDiv = document.createElement('div');
        gridDiv.className = 'dashboard-grid';

        // Location Card
        const locCard = document.createElement('div');
        locCard.className = 'dashboard-card full-width';
        locCard.onclick = () => document.querySelector('.nav-btn[data-target="view-map"]').click();
        locCard.innerHTML = `
            <div class="card-icon">📍</div>
            <div class="card-title">Location</div>
            <div class="card-value">View on Map</div>
            <div class="card-subtext">Tap to see the exact spot</div>
        `;
        gridDiv.appendChild(locCard);

        // Guests Card
        const guestCard = document.createElement('div');
        guestCard.className = 'dashboard-card';
        guestCard.onclick = () => document.querySelector('.nav-btn[data-target="view-participants"]').click();
        guestCard.innerHTML = `
            <div class="card-icon">👥</div>
            <div class="card-title">Guests</div>
        `;
        const guestValue = document.createElement('div');
        guestValue.className = 'card-value';
        guestValue.textContent = `${participantCount} joining`;
        guestCard.appendChild(guestValue);
        const guestSub = document.createElement('div');
        guestSub.className = 'card-subtext';
        guestSub.textContent = `Organized by ${organizerName}`;
        guestCard.appendChild(guestSub);
        gridDiv.appendChild(guestCard);

        // Potluck Card Summary
        const potluckCard = document.createElement('div');
        potluckCard.className = 'dashboard-card';
        potluckCard.onclick = () => document.querySelector('.nav-btn[data-target="view-potluck"]').click();
        potluckCard.innerHTML = `
            <div class="card-icon">🍔</div>
            <div class="card-title">Potluck Status</div>
            <div class="card-value">${claimedCount} / ${potluckCount}</div>
            <div class="card-subtext">items claimed</div>
        `;
        gridDiv.appendChild(potluckCard);

        // Share Card
        const shareCard = document.createElement('div');
        shareCard.className = 'dashboard-card full-width share-card';
        shareCard.onclick = e => e.stopPropagation();
        shareCard.innerHTML = `
            <div class="card-title" style="color: var(--text-main);">🔗 Invite Friends</div>
            <div class="card-subtext" style="color: rgba(255,255,255,0.7);">Share this secret link to invite others:</div>
        `;
        const shareInputGroup = document.createElement('div');
        shareInputGroup.className = 'share-input-group';
        const shareInput = document.createElement('input');
        shareInput.type = 'text';
        shareInput.value = shareUrl;
        shareInput.readOnly = true;
        shareInput.id = 'share-url-input';
        shareInputGroup.appendChild(shareInput);
        const shareBtn = document.createElement('button');
        shareBtn.className = 'btn-primary';
        shareBtn.id = 'copy-share-btn';
        shareBtn.textContent = 'Copy';
        shareInputGroup.appendChild(shareBtn);
        shareCard.appendChild(shareInputGroup);
        gridDiv.appendChild(shareCard);

        container.appendChild(gridDiv);

        // Dates Section
        const dateSection = document.createElement('div');
        dateSection.className = 'dashboard-section mt-4';
        dateSection.style.marginTop = '2rem';
        
        const dateH3 = document.createElement('h3');
        dateH3.style.cssText = 'margin-bottom: 1rem; color: var(--text-light); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;';
        dateH3.innerHTML = '🗓️ Date Options';
        const proposeBtn = document.createElement('button');
        proposeBtn.className = 'btn-secondary btn-sm';
        proposeBtn.id = 'propose-date-btn';
        proposeBtn.style.cssText = 'font-size: 0.8rem; padding: 4px 8px;';
        proposeBtn.textContent = 'Propose New Date';
        dateH3.appendChild(proposeBtn);
        dateSection.appendChild(dateH3);

        const dateUl = document.createElement('ul');
        dateUl.className = 'dates-list mini';
        dateUl.style.cssText = 'list-style: none; padding: 0; margin: 0;';

        if (!state.dates || state.dates.length === 0) {
            const noDateLi = document.createElement('li');
            noDateLi.style.cssText = 'color: var(--text-muted); padding: 10px 0;';
            noDateLi.textContent = 'No dates proposed yet.';
            dateUl.appendChild(noDateLi);
        } else {
            state.dates.forEach(date => {
                const myVote = state.currentUser ? date.votes.find(v => v.participantId === state.currentUser.id) : null;
                const voteCount = date.votes.length;
                const voters = date.votes.map(v => v.participantName).join(', ');

                const li = document.createElement('li');
                li.className = 'date-item flex-between';
                li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 8px;';
                
                const divLeft = document.createElement('div');
                const divTitle = document.createElement('div');
                divTitle.style.cssText = 'font-weight: 500; font-size: 1.1rem; margin-bottom: 4px;';
                divTitle.textContent = `${date.dateText} at ${date.timeText}`;
                
                const divSub = document.createElement('div');
                divSub.style.cssText = 'font-size: 0.85rem; color: var(--text-muted);';
                divSub.textContent = `${voteCount} vote(s)${voters ? ': ' + voters : ''}`;

                divLeft.appendChild(divTitle);
                divLeft.appendChild(divSub);

                const btnVote = document.createElement('button');
                btnVote.className = `btn-vote ${myVote ? 'btn-primary' : 'btn-secondary'}`;
                btnVote.dataset.dateId = date.id;
                btnVote.style.cssText = 'padding: 6px 12px; border-radius: 20px; flex-shrink: 0; margin-left: 10px;';
                btnVote.textContent = myVote ? '👍 Voted' : 'Vote';

                li.appendChild(divLeft);
                li.appendChild(btnVote);
                dateUl.appendChild(li);
            });
        }
        dateSection.appendChild(dateUl);
        container.appendChild(dateSection);

        // Potluck Items
        const potluckSection = document.createElement('div');
        potluckSection.className = 'dashboard-section mt-4';
        potluckSection.style.marginTop = '2rem';
        
        const potluckH3 = document.createElement('h3');
        potluckH3.style.cssText = 'margin-bottom: 1rem; color: var(--text-light); border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;';
        potluckH3.textContent = 'Potluck Items List';
        potluckSection.appendChild(potluckH3);

        const potluckUl = document.createElement('ul');
        potluckUl.className = 'potluck-list mini';
        potluckUl.style.cssText = 'list-style: none; padding: 0; margin: 0;';

        if (!state.potluckItems || state.potluckItems.length === 0) {
            const emptyLi = document.createElement('li');
            emptyLi.style.cssText = 'color: var(--text-muted); padding: 10px 0;';
            emptyLi.textContent = 'No items added yet.';
            potluckUl.appendChild(emptyLi);
        } else {
            state.potluckItems.forEach(item => {
                const isCovered = item.status === 'covered';
                const claimerName = isCovered
                    ? (state.currentUser && item.claimedBy.id === state.currentUser.id ? 'You' : item.claimedBy.name)
                    : 'Needed';
                
                const li = document.createElement('li');
                li.className = 'potluck-item mini-item flex-between';
                li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05);';

                const spanName = document.createElement('span');
                spanName.className = `item-name ${isCovered ? 'strike-through' : ''}`;
                if (isCovered) spanName.style.cssText = 'text-decoration: line-through; opacity: 0.7;';
                spanName.textContent = item.name;

                const badge = document.createElement('span');
                badge.className = 'badge';
                badge.style.cssText = `font-size: 0.85rem; padding: 4px 8px; border-radius: 12px; ${isCovered ? 'background: rgba(16, 185, 129, 0.2); color: #10b981;' : 'background: rgba(245, 158, 11, 0.2); color: #f59e0b;'}`;
                badge.textContent = isCovered ? `✅ ${claimerName}` : 'Needed';

                li.appendChild(spanName);
                li.appendChild(badge);
                potluckUl.appendChild(li);
            });
        }
        potluckSection.appendChild(potluckUl);

        const manageBtn = document.createElement('button');
        manageBtn.className = 'btn-secondary full-width mt-4';
        manageBtn.style.cssText = 'margin-top: 1rem; width: 100%;';
        manageBtn.onclick = () => document.querySelector('.nav-btn[data-target="view-potluck"]').click();
        manageBtn.textContent = 'Manage Potluck Items';
        potluckSection.appendChild(manageBtn);

        container.appendChild(potluckSection);

        // Propose date handler
        const proposeBtnEl = document.getElementById('propose-date-btn');
        if (proposeBtnEl) {
            proposeBtnEl.addEventListener('click', async () => {
                const dateResult = await requestDateAndTime();
                if (!dateResult) return;
                
                proposeBtnEl.textContent = 'Proposing...';
                await proposeDateApi(dateResult.dateText, dateResult.timeText);
            });
        }

        // Vote handlers
        document.querySelectorAll('.btn-vote').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const dateId = e.target.getAttribute('data-date-id');
                e.target.textContent = 'Voting...';
                e.target.disabled = true;
                await toggleVoteApi(dateId);
            });
        });

        // Add copy handler
        const copyBtn = document.getElementById('copy-share-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const input = document.getElementById('share-url-input');
                input.select();
                document.execCommand('copy');

                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                copyBtn.style.background = 'var(--success-color, #10b981)';

                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.background = '';
                }, 2000);
            });
        }
    };

    // Initial render attempt in case state is already populated
    renderDashboard();
};
