// js/components/potluck.js
import { state, claimPotluckItemApi, addPotluckItemApi } from '../state.js';

export const initPotluck = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Render function
    const renderPotluck = () => {
        container.innerHTML = '';
        
        const neededItems = state.potluckItems.filter(item => item.status === 'needed');
        const coveredItems = state.potluckItems.filter(item => item.status === 'covered');

        // Needed
        const neededH3 = document.createElement('h3');
        neededH3.textContent = 'Items Needed';
        container.appendChild(neededH3);
        
        const neededUl = document.createElement('ul');
        neededUl.className = 'potluck-list needed';
        if (neededItems.length === 0) {
            const emptyLi = document.createElement('li');
            emptyLi.style.cssText = 'color: var(--text-muted); padding: 10px;';
            emptyLi.textContent = 'All set! Nothing needed right now.';
            neededUl.appendChild(emptyLi);
        } else {
            neededItems.forEach(item => {
                const li = document.createElement('li');
                li.className = 'potluck-item fade-in';
                
                const spanName = document.createElement('span');
                spanName.className = 'item-name';
                spanName.textContent = item.name;
                
                const btn = document.createElement('button');
                btn.className = 'btn-primary claim-btn';
                btn.dataset.id = item.id;
                btn.textContent = "I'll bring this!";
                if (!state.currentUser) {
                    btn.disabled = true;
                    btn.title = 'Join picnic to claim';
                }
                
                li.appendChild(spanName);
                li.appendChild(btn);
                neededUl.appendChild(li);
            });
        }
        container.appendChild(neededUl);

        // Covered
        const coveredH3 = document.createElement('h3');
        coveredH3.className = 'mt-4';
        coveredH3.textContent = 'Covered Items';
        container.appendChild(coveredH3);

        const coveredUl = document.createElement('ul');
        coveredUl.className = 'potluck-list covered opacity-75';
        if (coveredItems.length === 0) {
            const emptyLi = document.createElement('li');
            emptyLi.style.cssText = 'color: var(--text-muted); padding: 10px;';
            emptyLi.textContent = 'No items covered yet.';
            coveredUl.appendChild(emptyLi);
        } else {
            coveredItems.forEach(item => {
                const isMyClaim = state.currentUser && item.claimedBy.id === state.currentUser.id;
                const li = document.createElement('li');
                li.className = 'potluck-item fade-in';
                
                const spanName = document.createElement('span');
                spanName.className = 'item-name strike-through';
                spanName.textContent = item.name;
                
                const spanBadge = document.createElement('span');
                spanBadge.className = 'claimed-badge';
                spanBadge.textContent = `✅ Brought by ${isMyClaim ? 'You' : item.claimedBy.name}`;
                
                li.appendChild(spanName);
                li.appendChild(spanBadge);
                coveredUl.appendChild(li);
            });
        }
        container.appendChild(coveredUl);

        // Add Item UI
        const addHtmlDiv = document.createElement('div');
        addHtmlDiv.className = 'add-item-container mt-4';
        addHtmlDiv.innerHTML = `
            <h3 style="margin-bottom: 8px;">Add New Item</h3>
            <div class="input-group">
                <input type="text" id="new-item-input" placeholder="${state.currentUser ? 'Needs bringing...' : 'Join picnic to add items'}" ${!state.currentUser ? 'disabled' : ''} />
                <button class="btn-icon" id="add-item-btn" aria-label="Add" ${!state.currentUser ? 'disabled' : ''}>
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
            </div>
        `;
        container.appendChild(addHtmlDiv);
    };

    // State Update Logic
    const claimItem = async (itemId) => {
        if (!state.currentUser) return;

        // Optimistic UI updates could go here, but we will just wait for API to succeed
        // and trigger state update
        const btn = container.querySelector(`.claim-btn[data-id="${itemId}"]`);
        if (btn) btn.textContent = 'Claiming...';

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
