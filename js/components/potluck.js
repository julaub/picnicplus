// js/components/potluck.js
import { state, claimPotluckItemApi, addPotluckItemApi } from '../state.js';

export const initPotluck = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Render function
    const renderPotluck = () => {
        const neededItems = state.potluckItems.filter(item => item.status === 'needed');
        const coveredItems = state.potluckItems.filter(item => item.status === 'covered');

        // Build the "Needed" UI
        let neededHtml = '<h3>Items Needed</h3><ul class="potluck-list needed">';
        if (neededItems.length === 0) neededHtml += '<li style="color: var(--text-muted); padding: 10px;">All set! Nothing needed right now.</li>';

        neededItems.forEach(item => {
            neededHtml += `
                <li class="potluck-item fade-in">
                    <span class="item-name">${item.name}</span>
                    <button class="btn-primary claim-btn" data-id="${item.id}" ${!state.currentUser ? 'disabled title="Join picnic to claim"' : ''}>I'll bring this!</button>
                </li>
            `;
        });
        neededHtml += '</ul>';

        // Build the "Covered" UI
        let coveredHtml = '<h3 class="mt-4">Covered Items</h3><ul class="potluck-list covered opacity-75">';
        if (coveredItems.length === 0) coveredHtml += '<li style="color: var(--text-muted); padding: 10px;">No items covered yet.</li>';

        coveredItems.forEach(item => {
            const isMyClaim = state.currentUser && item.claimedBy.id === state.currentUser.id;
            coveredHtml += `
                <li class="potluck-item fade-in">
                    <span class="item-name strike-through">${item.name}</span>
                    <span class="claimed-badge">✅ Brought by ${isMyClaim ? 'You' : item.claimedBy.name}</span>
                </li>
            `;
        });
        coveredHtml += '</ul>';

        // Build the "Add Item" UI
        const addHtml = `
            <div class="add-item-container mt-4">
                <h3 style="margin-bottom: 8px;">Add New Item</h3>
                <div class="input-group">
                    <input type="text" id="new-item-input" placeholder="${state.currentUser ? 'Needs bringing...' : 'Join picnic to add items'}" ${!state.currentUser ? 'disabled' : ''} />
                    <button class="btn-icon" id="add-item-btn" aria-label="Add" ${!state.currentUser ? 'disabled' : ''}>
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = neededHtml + coveredHtml + addHtml;
    };

    // State Update Logic
    const claimItem = async (itemId) => {
        if (!state.currentUser) return;

        // Optimistic UI updates could go here, but we will just wait for API to succeed
        // and trigger state update
        const btn = container.querySelector(`.claim-btn[data-id="${itemId}"]`);
        if (btn) btn.innerHTML = 'Claiming...';

        await claimPotluckItemApi(itemId);
    };

    const addNewItem = async (itemName) => {
        if (!state.currentUser) return;

        const input = container.querySelector('#new-item-input');
        if (input) input.disabled = true;

        await addPotluckItemApi(itemName);
    };

    // Attach event delegation for "Claim" and "Add" buttons
    container.addEventListener('click', (e) => {
        if (e.target.closest('.claim-btn')) {
            const itemId = e.target.closest('.claim-btn').dataset.id;
            claimItem(itemId);
        }

        if (e.target.closest('#add-item-btn')) {
            const input = container.querySelector('#new-item-input');
            if (input && input.value.trim()) {
                addNewItem(input.value.trim());
            }
        }
    });

    container.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.id === 'new-item-input') {
            const input = e.target;
            if (input.value.trim()) {
                addNewItem(input.value.trim());
            }
        }
    });

    renderPotluck();

    window.addEventListener('stateUpdated', (e) => {
        if (e.detail.topic === 'potluckItems' || e.detail.topic === 'all') renderPotluck();
    });
};
