// js/components/potluck.js
import { state, claimPotluckItemApi, addPotluckItemApi, removePotluckItemApi } from '../state.js';

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
        neededH3.textContent = 'Tasks & Items Needed';
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
                
                const totalClaimed = item.claims ? item.claims.reduce((acc, c) => acc + c.quantity, 0) : 0;
                
                const spanName = document.createElement('span');
                spanName.className = 'item-name';
                spanName.textContent = `${item.name} (${totalClaimed}/${item.quantity})`;
                
                const controlsDiv = document.createElement('div');
                controlsDiv.className = 'item-controls flex-center';
                
                if (state.currentUser) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn-icon remove-item-btn';
                    deleteBtn.dataset.id = item.id;
                    deleteBtn.innerHTML = '🗑️';
                    deleteBtn.title = 'Remove item';
                    controlsDiv.appendChild(deleteBtn);
                }

                const claimInput = document.createElement('input');
                claimInput.type = 'number';
                claimInput.className = 'claim-qty-input';
                claimInput.min = '1';
                claimInput.max = item.quantity - totalClaimed;
                claimInput.value = '1';
                claimInput.style.cssText = 'width: 50px; margin-right: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 4px; padding: 2px 5px;';
                if (!state.currentUser) claimInput.disabled = true;

                const btn = document.createElement('button');
                btn.className = 'btn-primary claim-btn';
                btn.dataset.id = item.id;
                btn.textContent = "Bring";
                btn.style.padding = '0.3rem 0.6rem';
                
                if (!state.currentUser) {
                    btn.disabled = true;
                    btn.title = 'Join event to claim';
                }
                
                controlsDiv.appendChild(claimInput);
                controlsDiv.appendChild(btn);
                
                li.appendChild(spanName);
                li.appendChild(controlsDiv);
                neededUl.appendChild(li);
            });
        }
        container.appendChild(neededUl);

        // Covered
        const coveredH3 = document.createElement('h3');
        coveredH3.className = 'mt-4';
        coveredH3.textContent = 'Covered Tasks & Items';
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
                const li = document.createElement('li');
                li.className = 'potluck-item fade-in';
                
                const spanName = document.createElement('span');
                spanName.className = 'item-name strike-through';
                spanName.textContent = `${item.name} (${item.quantity}/${item.quantity})`;
                
                const spanBadge = document.createElement('span');
                spanBadge.className = 'claimed-badge';
                const claimsTexts = item.claims ? item.claims.map(c => `${c.participantId === (state.currentUser?.id) ? 'You' : c.participantName} (${c.quantity})`).join(', ') : '';
                spanBadge.textContent = `✅ Brought by: ${claimsTexts}`;
                
                const controlsDiv = document.createElement('div');
                controlsDiv.className = 'item-controls flex-center';
                
                if (state.currentUser) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn-icon remove-item-btn';
                    deleteBtn.dataset.id = item.id;
                    deleteBtn.innerHTML = '🗑️';
                    deleteBtn.title = 'Remove item';
                    controlsDiv.appendChild(deleteBtn);
                }
                
                controlsDiv.appendChild(spanBadge);
                
                li.appendChild(spanName);
                li.appendChild(controlsDiv);
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
                <input type="text" id="new-item-input" placeholder="${state.currentUser ? 'Needs bringing...' : 'Join event to add items'}" ${!state.currentUser ? 'disabled' : ''} />
                <input type="number" id="new-item-qty" placeholder="Qty" value="1" min="1" style="width: 70px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 4px; padding: 2px 5px;" ${!state.currentUser ? 'disabled' : ''} />
                <button class="btn-icon" id="add-item-btn" aria-label="Add" ${!state.currentUser ? 'disabled' : ''}>
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
            </div>
        `;
        container.appendChild(addHtmlDiv);
    };

    // State Update Logic
    const claimItem = async (itemId, quantity) => {
        if (!state.currentUser) return;
        const btn = container.querySelector(`.claim-btn[data-id="${itemId}"]`);
        if (btn) btn.textContent = '...';
        await claimPotluckItemApi(itemId, quantity);
    };

    const addNewItem = async (itemName, quantity) => {
        if (!state.currentUser) return;
        const input = container.querySelector('#new-item-input');
        if (input) input.disabled = true;
        await addPotluckItemApi(itemName, quantity);
    };
    
    const removeItem = async (itemId) => {
        if (!state.currentUser) return;
        if (confirm("Are you sure you want to remove this item?")) {
            await removePotluckItemApi(itemId);
        }
    };

    // Attach event delegation for "Claim" and "Add" buttons
    container.addEventListener('click', (e) => {
        if (e.target.closest('.claim-btn')) {
            const btn = e.target.closest('.claim-btn');
            const itemId = btn.dataset.id;
            const li = btn.closest('li');
            const qtyInput = li.querySelector('.claim-qty-input');
            const qty = qtyInput ? parseInt(qtyInput.value) : 1;
            claimItem(itemId, qty);
        }

        if (e.target.closest('.remove-item-btn')) {
            const btn = e.target.closest('.remove-item-btn');
            removeItem(btn.dataset.id);
        }

        if (e.target.closest('#add-item-btn')) {
            const input = container.querySelector('#new-item-input');
            const qtyInput = container.querySelector('#new-item-qty');
            if (input && input.value.trim()) {
                const qty = qtyInput ? parseInt(qtyInput.value) : 1;
                addNewItem(input.value.trim(), qty);
            }
        }
    });

    container.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && (e.target.id === 'new-item-input' || e.target.id === 'new-item-qty')) {
            const input = container.querySelector('#new-item-input');
            const qtyInput = container.querySelector('#new-item-qty');
            if (input && input.value.trim()) {
                const qty = qtyInput ? parseInt(qtyInput.value) : 1;
                addNewItem(input.value.trim(), qty);
            }
        }
    });

    renderPotluck();

    window.addEventListener('stateUpdated', (e) => {
        if (e.detail.topic === 'potluckItems' || e.detail.topic === 'all') renderPotluck();
    });
};
