// ===== MODAL SYSTEM =====
import { escapeHtml } from './utils.js';

let _currentResolve = null;

export function showModal({ title, bodyHTML, submitText = 'Submit', cancelText = 'Cancel', onSubmit = null }) {
    const overlay = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML || '';

    const submitBtn = document.getElementById('modalSubmitBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');

    submitBtn.textContent = submitText;
    cancelBtn.textContent = cancelText;

    // Clear old listeners by cloning
    const newSubmit = submitBtn.cloneNode(true);
    const newCancel = cancelBtn.cloneNode(true);
    submitBtn.replaceWith(newSubmit);
    cancelBtn.replaceWith(newCancel);

    newCancel.addEventListener('click', closeModal);
    if (onSubmit) {
        newSubmit.addEventListener('click', onSubmit);
    }

    overlay.classList.add('active');
}

export function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('active');
    if (_currentResolve) {
        _currentResolve(false);
        _currentResolve = null;
    }
}

export function showConfirm(message) {
    return new Promise(resolve => {
        _currentResolve = resolve;
        showModal({
            title: 'Confirm',
            bodyHTML: `<p>${escapeHtml(message)}</p>`,
            submitText: 'Confirm',
            cancelText: 'Cancel',
            onSubmit: () => {
                _currentResolve = null;
                closeModal();
                resolve(true);
            }
        });
    });
}

// Initialize modal close button
export function initModal() {
    document.getElementById('modalClose')?.addEventListener('click', closeModal);

    // Close on backdrop click
    document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'modalOverlay') closeModal();
    });
}
