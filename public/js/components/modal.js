// js/components/modal.js

// Initialize containers
document.addEventListener('DOMContentLoaded', () => {
    // Modal Overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'custom-modal';
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML = `
        <div class="modal-content">
            <h3 id="modal-title" class="modal-title"></h3>
            <p id="modal-message" class="modal-message"></p>
            <input type="text" id="modal-input" class="modal-input" style="display: none;">
            <div class="modal-actions">
                <button id="modal-cancel" class="modal-btn modal-btn-cancel">Cancel</button>
                <button id="modal-confirm" class="modal-btn modal-btn-confirm">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    // Toast Container
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
});

export const showPrompt = (title, message = '', placeholder = '') => {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        const titleEl = document.getElementById('modal-title');
        const messageEl = document.getElementById('modal-message');
        const inputEl = document.getElementById('modal-input');
        const cancelBtn = document.getElementById('modal-cancel');
        const confirmBtn = document.getElementById('modal-confirm');

        titleEl.textContent = title;
        if (message) {
            messageEl.textContent = message;
            messageEl.style.display = 'block';
        } else {
            messageEl.style.display = 'none';
        }

        inputEl.style.display = 'block';
        inputEl.value = '';
        inputEl.placeholder = placeholder;
        cancelBtn.style.display = 'block';

        const cleanup = () => {
            modal.classList.remove('active');
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            inputEl.onkeypress = null;
        };

        confirmBtn.onclick = () => {
            cleanup();
            resolve(inputEl.value.trim() || null);
        };

        cancelBtn.onclick = () => {
            cleanup();
            resolve(null);
        };

        inputEl.onkeypress = (e) => {
            if (e.key === 'Enter') confirmBtn.click();
        };

        modal.classList.add('active');
        setTimeout(() => inputEl.focus(), 100);
    });
};

export const showAlert = (title, message = '') => {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        const titleEl = document.getElementById('modal-title');
        const messageEl = document.getElementById('modal-message');
        const inputEl = document.getElementById('modal-input');
        const cancelBtn = document.getElementById('modal-cancel');
        const confirmBtn = document.getElementById('modal-confirm');

        titleEl.textContent = title;
        if (message) {
            messageEl.textContent = message;
            messageEl.style.display = 'block';
        } else {
            messageEl.style.display = 'none';
        }

        inputEl.style.display = 'none';
        cancelBtn.style.display = 'none';

        const cleanup = () => {
            modal.classList.remove('active');
            confirmBtn.onclick = null;
        };

        confirmBtn.onclick = () => {
            cleanup();
            resolve(true);
        };

        modal.classList.add('active');
        setTimeout(() => confirmBtn.focus(), 100);
    });
};

export const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? '✅' : '⚠️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
};