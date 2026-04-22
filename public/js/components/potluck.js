// js/components/potluck.js
import { state, claimPotluckItemApi, addPotluckItemApi, removePotluckItemApi } from '../state.js';
import { t } from '../i18n.js';

const ITEM_ICON_MAP = {
    food: '🍱', drink: '🥤', gear: '🧺', sweet: '🍫', salad: '🥗', main: '🍢', default: '📦'
};

const guessIcon = (name) => {
    const n = name.toLowerCase();
    if (/water|lemonade|juice|beer|wine|soda|drink/.test(n)) return '🥤';
    if (/salad|feta|watermelon|greens/.test(n)) return '🥗';
    if (/brownie|cake|cookie|sweet|tart|galette|dessert/.test(n)) return '🍫';
    if (/blanket|frisbee|speaker|gear|tent|table/.test(n)) return '🧺';
    if (/bread|sourdough|wrap|skewer|bbq|grill/.test(n)) return '🍢';
    return '🍱';
};

const CATS = [
    { k: 'all', labelKey: 'potluck.cat_all' },
    { k: 'needed', labelKey: 'potluck.cat_needed' },
    { k: 'covered', labelKey: 'potluck.cat_covered' },
];

export const initPotluck = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    let activeCat = 'all';

    const claimItem = async (itemId, quantity, btn) => {
        if (!state.currentUser) return;
        const orig = btn.innerHTML;
        btn.textContent = '…';
        btn.disabled = true;
        await claimPotluckItemApi(itemId, quantity);
        btn.innerHTML = orig;
        btn.disabled = false;
    };

    const addNewItem = async (itemName, quantity) => {
        if (!state.currentUser || !itemName.trim()) return;
        await addPotluckItemApi(itemName.trim(), quantity);
    };

    const removeItem = async (itemId) => {
        if (!state.currentUser) return;
        if (confirm(t('potluck.confirm_remove'))) await removePotluckItemApi(itemId);
    };

    const renderPotluck = () => {
        container.innerHTML = '';
        const items = state.potluckItems || [];
        const total = items.length;
        const claimed = items.filter(i => i.status === 'covered').length;
        const pct = total > 0 ? Math.round((claimed / total) * 100) : 0;

        // ── Header ──
        const header = document.createElement('div');
        header.className = 'pp-header';
        header.innerHTML = `
            <div>
                <div class="pp-subtitle" style="color:var(--green-700);text-transform:uppercase;letter-spacing:.06em;font-size:11px;font-weight:700;">${t('potluck.eyebrow')}</div>
                <h1 class="pp-title">${t('potluck.title')}</h1>
                <div class="pp-subtitle" style="margin-top:4px;">${t('potluck.subtitle')}</div>
            </div>`;

        // progress bar inside header
        const prog = document.createElement('div');
        prog.className = 'pp-progress-wrap';
        prog.innerHTML = `
            <div class="pp-progress-row">
                <span>${t('potluck.progress', { claimed, total })}</span>
                <span class="pp-progress-pct">${pct}%</span>
            </div>
            <div class="pp-progress-bar-bg">
                <div class="pp-progress-bar-fill" style="width:${pct}%"></div>
            </div>`;
        header.appendChild(prog);
        container.appendChild(header);

        // ── Category filter ──
        const catRow = document.createElement('div');
        catRow.className = 'pp-cat-row';
        catRow.style.marginTop = '12px';
        CATS.forEach(c => {
            const btn = document.createElement('button');
            btn.className = `pp-cat${activeCat === c.k ? ' on' : ''}`;
            btn.textContent = t(c.labelKey);
            btn.addEventListener('click', () => { activeCat = c.k; renderPotluck(); });
            catRow.appendChild(btn);
        });
        container.appendChild(catRow);

        // ── Items card ──
        const filtered = activeCat === 'all' ? items
            : activeCat === 'needed' ? items.filter(i => i.status === 'needed')
            : items.filter(i => i.status === 'covered');

        const card = document.createElement('div');
        card.className = 'pp-items-card';
        card.style.marginTop = '10px';

        if (filtered.length === 0 && total === 0) {
            card.innerHTML = `<div style="padding:24px 16px;text-align:center;color:var(--ink-400);font-size:14px;">${t('potluck.empty_all')}</div>`;
        } else if (filtered.length === 0) {
            card.innerHTML = `<div style="padding:20px 16px;text-align:center;color:var(--ink-400);font-size:14px;">${t('potluck.empty_cat')}</div>`;
        } else {
            filtered.forEach(item => {
                const isCovered = item.status === 'covered';
                const totalClaimed = item.claims ? item.claims.reduce((a, c) => a + c.quantity, 0) : 0;
                const myClaimObj = state.currentUser ? item.claims?.find(c => c.participantId === state.currentUser.id) : null;
                const claimedByNames = item.claims ? item.claims.map(c =>
                    (state.currentUser && c.participantId === state.currentUser.id ? t('potluck.you') : c.participantName)
                ).join(', ') : '';

                const row = document.createElement('div');
                row.className = 'pp-item';

                const icon = document.createElement('div');
                icon.className = 'pp-item-icon';
                icon.style.background = isCovered ? 'var(--green-50)' : 'var(--ink-100)';
                icon.textContent = guessIcon(item.name);

                const body = document.createElement('div');
                body.className = 'pp-item-body';
                const metaTail = isCovered && claimedByNames
                    ? t('potluck.brought_by', { names: claimedByNames })
                    : t('potluck.unclaimed');
                body.innerHTML = `
                    <div class="pp-item-name">${item.name}</div>
                    <div class="pp-item-meta">${totalClaimed}/${item.quantity} · ${metaTail}</div>`;

                const controls = document.createElement('div');
                controls.style.cssText = 'display:flex;align-items:center;gap:6px;flex-shrink:0;';

                if (state.currentUser) {
                    const delBtn = document.createElement('button');
                    delBtn.style.cssText = 'width:28px;height:28px;border-radius:8px;background:transparent;color:var(--ink-300);display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;border:none;transition:background .15s,color .15s;';
                    delBtn.textContent = '🗑';
                    delBtn.title = t('potluck.remove_item');
                    delBtn.addEventListener('mouseover', () => { delBtn.style.background = '#FDECE8'; delBtn.style.color = 'var(--danger)'; });
                    delBtn.addEventListener('mouseout', () => { delBtn.style.background = 'transparent'; delBtn.style.color = 'var(--ink-300)'; });
                    delBtn.addEventListener('click', () => removeItem(item.id));
                    controls.appendChild(delBtn);
                }

                if (!isCovered && state.currentUser) {
                    const claimBtn = document.createElement('button');
                    claimBtn.className = 'pp-claim-btn';
                    claimBtn.textContent = t('potluck.claim');
                    claimBtn.addEventListener('click', () => claimItem(item.id, 1, claimBtn));
                    controls.appendChild(claimBtn);
                } else if (myClaimObj) {
                    const youBadge = document.createElement('button');
                    youBadge.className = 'pp-claimed-badge';
                    youBadge.textContent = t('potluck.claimed_you');
                    controls.appendChild(youBadge);
                } else if (isCovered) {
                    const covBadge = document.createElement('div');
                    covBadge.style.cssText = 'font-size:18px;';
                    covBadge.textContent = '✅';
                    controls.appendChild(covBadge);
                } else if (!state.currentUser) {
                    const claimBtn = document.createElement('button');
                    claimBtn.className = 'pp-claim-btn';
                    claimBtn.textContent = t('potluck.claim');
                    claimBtn.disabled = true;
                    claimBtn.title = t('potluck.join_to_claim');
                    claimBtn.style.opacity = '0.5';
                    controls.appendChild(claimBtn);
                }

                row.appendChild(icon);
                row.appendChild(body);
                row.appendChild(controls);
                card.appendChild(row);
            });
        }
        container.appendChild(card);

        // ── Add item ──
        const addWrap = document.createElement('div');
        addWrap.style.cssText = 'padding:10px 16px 0;';

        if (state.currentUser) {
            const addRow = document.createElement('div');
            addRow.style.cssText = 'display:flex;gap:8px;align-items:center;';
            addRow.innerHTML = `
                <input type="text" id="new-item-input" placeholder="${t('potluck.suggest_placeholder')}" style="flex:1;height:44px;border-radius:999px;padding:0 16px;font-size:14px;font-weight:500;background:#fff;border:1.5px dashed var(--ink-300);color:var(--ink-900);font-family:inherit;outline:none;">
                <button id="add-item-btn" style="width:44px;height:44px;border-radius:50%;background:var(--green-700);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(14,122,77,.25);">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>`;
            addWrap.appendChild(addRow);

            const addHandler = () => {
                const input = addWrap.querySelector('#new-item-input');
                if (input?.value.trim()) { addNewItem(input.value, 1); input.value = ''; }
            };

            addWrap.querySelector('#add-item-btn').addEventListener('click', addHandler);
            addWrap.querySelector('#new-item-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') addHandler(); });
        } else {
            const hint = document.createElement('div');
            hint.className = 'pp-info';
            hint.innerHTML = `<span>ℹ️</span><span>${t('potluck.join_hint')}</span>`;
            addWrap.appendChild(hint);
        }

        container.appendChild(addWrap);

        const spacer = document.createElement('div');
        spacer.style.height = '24px';
        container.appendChild(spacer);
    };

    renderPotluck();
    window.addEventListener('stateUpdated', (e) => {
        if (e.detail.topic === 'potluckItems' || e.detail.topic === 'all') renderPotluck();
    });
    window.addEventListener('localeChange', renderPotluck);
};
