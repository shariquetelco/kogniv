// ===== UI RENDERING =====
// Dashboard, card grid, split view, toasts, progress overlay

import { AppState } from './state.js';
import { Storage } from './storage.js';
import { escapeHtml, getTagColor, formatDate } from './utils.js';
import { showModal, closeModal, showConfirm } from './modal.js';

// ==========================================
//  DASHBOARD
// ==========================================

export function renderDashboard() {
    const workspaces = Storage.getWorkspaces();
    const sortEl = document.getElementById('wsSortSelect');
    const sort = sortEl ? sortEl.value : 'recent';

    let sorted = [...workspaces];
    if (sort === 'recent') sorted.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    else if (sort === 'starred') sorted.sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || new Date(b.lastModified) - new Date(a.lastModified));
    else if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));

    const grid = document.getElementById('workspacesGrid');
    const section = document.getElementById('dashWorkspacesSection');

    if (sorted.length === 0) {
        if (section) section.style.display = 'none';
        return;
    }

    if (section) section.style.display = 'block';

    grid.innerHTML = sorted.map(ws => `
        <div class="workspace-card" data-ws-id="${ws.id}">
            <div class="workspace-card-actions">
                <button class="ws-action-btn ${ws.starred ? 'starred' : ''}"
                        data-action="star" data-ws-id="${ws.id}" title="Star">
                    ${ws.starred ? '★' : '☆'}
                </button>
                <button class="ws-action-btn ws-delete-btn"
                        data-action="delete" data-ws-id="${ws.id}" title="Delete">
                    🗑
                </button>
            </div>
            <h3 class="workspace-card-title">${escapeHtml(ws.name)}</h3>
            <div class="workspace-card-meta">${ws.cardCount || 0} cards</div>
            <div class="workspace-card-meta">${formatDate(ws.lastModified)}</div>
        </div>
    `).join('');
}

export function handleWorkspaceGridClick(e, openWorkspaceFn) {
    const actionBtn = e.target.closest('[data-action]');

    if (actionBtn) {
        e.stopPropagation();
        const { action } = actionBtn.dataset;
        const wsId = actionBtn.dataset.wsId;

        if (action === 'star') {
            const workspaces = Storage.getWorkspaces();
            const ws = workspaces.find(w => w.id === wsId);
            if (ws) {
                Storage.setStarred(wsId, !ws.starred);
                renderDashboard();
            }
        } else if (action === 'delete') {
            showConfirm('Delete this workspace? This cannot be undone.').then(confirmed => {
                if (confirmed) {
                    Storage.deleteWorkspace(wsId);
                    renderDashboard();
                    showToast('Workspace deleted', 'info');
                }
            });
        }
        return;
    }

    const card = e.target.closest('[data-ws-id]');
    if (card) {
        openWorkspaceFn(card.dataset.wsId);
    }
}

// ==========================================
//  WORKSPACE HEADER
// ==========================================

export function updateWorkspaceHeader() {
    const state = AppState.get();
    const nameEl = document.getElementById('workspaceName');
    if (nameEl) nameEl.textContent = state.workspaceName;
}

// ==========================================
//  CATEGORIES
// ==========================================

export function renderCategories() {
    const state = AppState.get();
    const bar = document.getElementById('categoryBar');
    if (!bar) return;

    const totalCards = state.cards.length;
    const catCounts = {};
    state.cards.forEach(c => {
        catCounts[c.category] = (catCounts[c.category] || 0) + 1;
    });

    let html = `<button class="category-btn ${state.currentCategory === 'all' ? 'active' : ''}" data-category="all">All ${totalCards}</button>`;

    state.categories.forEach(cat => {
        const count = catCounts[cat] || 0;
        html += `<button class="category-btn ${state.currentCategory === cat ? 'active' : ''}" data-category="${escapeHtml(cat)}">
            ${escapeHtml(cat)} ${count}
            ${state.editMode ? `<span class="category-delete" data-delete-cat="${escapeHtml(cat)}">✕</span>` : ''}
        </button>`;
    });

    if (state.editMode) {
        html += `<button class="add-category-btn" id="addCategoryBtn">+ Add</button>`;
    }

    bar.innerHTML = html;
}

export function handleCategoryClick(e, renderFn) {
    const deleteBtn = e.target.closest('[data-delete-cat]');
    if (deleteBtn) {
        e.stopPropagation();
        const cat = deleteBtn.dataset.deleteCat;
        showConfirm(`Delete category "${cat}" and all its cards?`).then(confirmed => {
            if (confirmed) {
                const state = AppState.get();
                AppState.set({
                    cards: state.cards.filter(c => c.category !== cat),
                    categories: state.categories.filter(c => c !== cat),
                    currentCategory: 'all'
                });
                saveCurrentWorkspace();
                renderFn();
            }
        });
        return;
    }

    if (e.target.id === 'addCategoryBtn') {
        showAddCategoryModal(renderFn);
        return;
    }

    const btn = e.target.closest('[data-category]');
    if (btn) {
        AppState.set({ currentCategory: btn.dataset.category });
        renderFn();
    }
}

function showAddCategoryModal(renderFn) {
    showModal({
        title: 'Add Category',
        bodyHTML: `
            <div class="form-group">
                <label class="form-label">Category Name</label>
                <input type="text" id="newCategoryName" class="form-input" placeholder="e.g. Physics, History..." autofocus>
            </div>
        `,
        submitText: 'Add',
        onSubmit: () => {
            const name = document.getElementById('newCategoryName').value.trim();
            if (!name) return;
            const state = AppState.get();
            if (state.categories.includes(name)) {
                showToast('Category already exists', 'error');
                return;
            }
            AppState.set({ categories: [...state.categories, name] });
            saveCurrentWorkspace();
            closeModal();
            renderFn();
        }
    });
}

// ==========================================
//  CARD GRID (Full-width default view)
// ==========================================

export function renderCards() {
    const state = AppState.get();
    const filtered = AppState.getFilteredCards();
    AppState.set({ filteredCards: filtered });

    const grid = document.getElementById('cardsGrid');
    if (!grid) return;

    // Update stats
    const isFiltered = state.searchQuery || state.currentCategory !== 'all';
    const countEl = document.getElementById('cardCount');
    if (countEl) countEl.textContent = isFiltered ? filtered.length : state.cards.length;
    const catCountEl = document.getElementById('categoryCount');
    if (catCountEl) catCountEl.textContent = state.categories.length;

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-text">${state.cards.length === 0 ? 'No cards yet' : 'No cards match your filter'}</div>
                <p style="opacity:0.6;">${state.cards.length === 0 ? 'Upload a document or create your first card' : 'Try a different search or category'}</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(card => {
        const tagColor = getTagColor(card.category);
        return `
            <div class="card ${state.editMode ? 'edit-mode' : ''}" data-card-id="${card.id}">
                <div class="card-tag" style="background-color:${tagColor};">${escapeHtml(card.category)}</div>
                <div class="card-title">${escapeHtml(card.title)}</div>
                <div class="card-hint">${escapeHtml(card.hint)}</div>
                ${state.editMode ? `
                    <div class="card-actions">
                        <button class="card-action-btn card-edit-btn" data-edit-card="${card.id}">Edit</button>
                        <button class="card-action-btn card-delete-btn" data-delete-card="${card.id}">Delete</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    if (state.editMode) {
        grid.innerHTML += `
            <div class="add-card-tile" id="addCardTile">
                <span>+ Add Card</span>
            </div>
        `;
    }
}

export function handleCardGridClick(e, openSplitViewFn) {
    const state = AppState.get();

    // Edit card button
    const editBtn = e.target.closest('[data-edit-card]');
    if (editBtn) {
        e.stopPropagation();
        const card = state.cards.find(c => c.id === editBtn.dataset.editCard);
        if (card) showEditCardModal(card);
        return;
    }

    // Delete card button
    const deleteBtn = e.target.closest('[data-delete-card]');
    if (deleteBtn) {
        e.stopPropagation();
        showConfirm('Delete this card?').then(confirmed => {
            if (confirmed) {
                AppState.set({ cards: AppState.get().cards.filter(c => c.id !== deleteBtn.dataset.deleteCard) });
                saveCurrentWorkspace();
                renderCards();
                renderCategories();
            }
        });
        return;
    }

    // Add card tile
    if (e.target.closest('#addCardTile')) {
        showAddCardModal();
        return;
    }

    // Card click → open split view
    const cardEl = e.target.closest('[data-card-id]');
    if (cardEl && !state.editMode) {
        const filtered = AppState.getFilteredCards();
        const card = state.cards.find(c => c.id === cardEl.dataset.cardId);
        if (card) openSplitViewFn(card, filtered);
    }
}

// ==========================================
//  SPLIT VIEW (30% card list / 70% reader)
// ==========================================

export function openSplitView(card, allCards) {
    const body = document.getElementById('workspaceBody');
    body.classList.add('split-active');
    AppState.set({ selectedCardId: card.id, splitViewActive: true });

    renderCardList(allCards, card.id);
    renderCardReader(card);
}

export function closeSplitView() {
    const body = document.getElementById('workspaceBody');
    body.classList.remove('split-active');
    AppState.set({ selectedCardId: null, splitViewActive: false });

    // Exit edit mode in reader
    const readerPane = document.getElementById('cardReaderPane');
    if (readerPane) readerPane.classList.remove('editing');
}

function renderCardList(cards, activeCardId) {
    const container = document.getElementById('cardListItems');
    if (!container) return;

    const countEl = document.getElementById('cardListCount');
    if (countEl) countEl.textContent = `${cards.length} cards`;

    container.innerHTML = cards.map(card => {
        const tagColor = getTagColor(card.category);
        return `
            <div class="card-list-item ${card.id === activeCardId ? 'active' : ''}" data-list-card-id="${card.id}">
                <span class="card-list-dot" style="background:${tagColor};"></span>
                <span class="card-list-item-title">${escapeHtml(card.title)}</span>
            </div>
        `;
    }).join('');
}

export function handleCardListClick(e) {
    const item = e.target.closest('[data-list-card-id]');
    if (!item) return;

    const state = AppState.get();
    const card = state.cards.find(c => c.id === item.dataset.listCardId);
    if (!card) return;

    AppState.set({ selectedCardId: card.id });

    // Update active state
    document.querySelectorAll('.card-list-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');

    renderCardReader(card);
}

function renderCardReader(card) {
    const pane = document.getElementById('cardReaderPane');
    if (!pane) return;

    const state = AppState.get();
    const filtered = state.filteredCards.length > 0 ? state.filteredCards : state.cards;
    const idx = filtered.findIndex(c => c.id === card.id);
    const total = filtered.length;

    const tagColor = getTagColor(card.category);

    pane.innerHTML = `
        <div class="reader-header">
            <div class="reader-nav">
                <button class="reader-nav-btn" id="readerPrevBtn" ${idx <= 0 ? 'disabled' : ''}>&#9664;</button>
                <span class="reader-nav-counter">${idx + 1} / ${total}</span>
                <button class="reader-nav-btn" id="readerNextBtn" ${idx >= total - 1 ? 'disabled' : ''}>&#9654;</button>
            </div>
            <div class="reader-actions">
                <button class="reader-action-btn" id="readerEditBtn">Edit</button>
            </div>
        </div>

        <div class="reader-body">
            <span class="reader-tag" style="background:${tagColor};">${escapeHtml(card.category)}</span>
            <h2 class="reader-title">${escapeHtml(card.title)}</h2>
            <div class="reader-content" id="readerContent">${card.content}</div>
            <div class="reader-editable" id="readerEditable" contenteditable="true" style="display:none;" data-card-id="${card.id}">${card.content}</div>
        </div>

        <div class="reader-edit-toolbar" id="readerEditToolbar" style="display:none;">
            <button class="toolbar-btn" data-format="bold" title="Bold"><b>B</b></button>
            <button class="toolbar-btn" data-format="italic" title="Italic"><i>I</i></button>
            <button class="toolbar-btn" data-format="underline" title="Underline"><u>U</u></button>
            <div class="toolbar-separator"></div>
            <button class="toolbar-btn" data-format="insertUnorderedList" title="Bullet List">&#8226;</button>
            <button class="toolbar-btn" data-format="insertOrderedList" title="Numbered List">1.</button>
            <div class="toolbar-separator"></div>
            <button class="toolbar-btn" data-format="answer" title="Answer Box">A</button>
            <button class="toolbar-btn" data-format="tip" title="Tip Box">Tip</button>
            <button class="toolbar-btn" data-format="warning" title="Warning Box">&#9888;</button>
        </div>
    `;

    // Wire nav buttons
    const prevBtn = document.getElementById('readerPrevBtn');
    const nextBtn = document.getElementById('readerNextBtn');
    prevBtn?.addEventListener('click', () => navigateReader(-1, filtered));
    nextBtn?.addEventListener('click', () => navigateReader(1, filtered));

    // Wire edit button
    document.getElementById('readerEditBtn')?.addEventListener('click', () => toggleReaderEdit(card));

    // Wire format buttons
    pane.querySelectorAll('[data-format]').forEach(btn => {
        btn.addEventListener('click', () => applyFormat(btn.dataset.format));
    });
}

function navigateReader(direction, cards) {
    const state = AppState.get();
    const idx = cards.findIndex(c => c.id === state.selectedCardId);
    const newIdx = idx + direction;
    if (newIdx >= 0 && newIdx < cards.length) {
        const card = cards[newIdx];
        AppState.set({ selectedCardId: card.id });
        renderCardReader(card);

        // Update list active state
        document.querySelectorAll('.card-list-item').forEach(el => el.classList.remove('active'));
        const activeItem = document.querySelector(`[data-list-card-id="${card.id}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
            activeItem.scrollIntoView({ block: 'nearest' });
        }
    }
}

function toggleReaderEdit(card) {
    const content = document.getElementById('readerContent');
    const editable = document.getElementById('readerEditable');
    const toolbar = document.getElementById('readerEditToolbar');
    const editBtn = document.getElementById('readerEditBtn');

    if (!content || !editable) return;

    const isEditing = content.style.display === 'none';

    if (isEditing) {
        // Save changes
        card.content = editable.innerHTML;
        card.hint = editable.textContent.substring(0, 150);
        content.innerHTML = card.content;
        content.style.display = '';
        editable.style.display = 'none';
        toolbar.style.display = 'none';
        editBtn.textContent = 'Edit';

        saveCurrentWorkspace();
        renderCards();
    } else {
        // Enter edit mode
        editable.innerHTML = card.content;
        content.style.display = 'none';
        editable.style.display = 'block';
        toolbar.style.display = 'flex';
        editBtn.textContent = 'Save';
        editable.focus();
    }
}

function applyFormat(format) {
    const editable = document.getElementById('readerEditable');
    if (!editable) return;

    if (format === 'answer' || format === 'tip' || format === 'warning') {
        const classMap = { answer: 'answer-box', tip: 'tip-box', warning: 'warning-box' };
        const labelMap = { answer: 'Answer:', tip: 'Tip:', warning: 'Warning:' };
        const selection = window.getSelection();
        const selectedText = selection.toString() || labelMap[format];
        const box = document.createElement('div');
        box.className = classMap[format];
        box.innerHTML = `<strong>${labelMap[format]}</strong> ${selectedText}`;
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(box);
        }
    } else {
        document.execCommand(format, false, null);
    }

    editable.focus();
}

// ==========================================
//  CARD CRUD MODALS
// ==========================================

function showAddCardModal() {
    const state = AppState.get();
    const catOptions = ['Uncategorized', ...state.categories].map(cat =>
        `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`
    ).join('');

    showModal({
        title: 'Add Card',
        bodyHTML: `
            <div class="form-group">
                <label class="form-label">Title</label>
                <input type="text" id="newCardTitle" class="form-input" placeholder="Card title" autofocus>
            </div>
            <div class="form-group">
                <label class="form-label">Category</label>
                <select id="newCardCategory" class="form-select">${catOptions}</select>
            </div>
            <div class="form-group">
                <label class="form-label">Content</label>
                <textarea id="newCardContent" class="form-textarea" placeholder="Card content..."></textarea>
            </div>
        `,
        submitText: 'Add Card',
        onSubmit: () => {
            const title = document.getElementById('newCardTitle').value.trim();
            const category = document.getElementById('newCardCategory').value;
            const content = document.getElementById('newCardContent').value.trim();

            if (!title) { showToast('Please enter a title', 'error'); return; }

            const state = AppState.get();
            const newCard = {
                id: Math.random().toString(36).substr(2, 9),
                title,
                hint: (content || title).substring(0, 150),
                content: content || title,
                category: category || 'Uncategorized',
                created: new Date().toISOString()
            };

            const cats = state.categories.includes(newCard.category)
                ? state.categories
                : [...state.categories, newCard.category];

            AppState.set({ cards: [...state.cards, newCard], categories: cats });
            saveCurrentWorkspace();
            closeModal();
            renderCategories();
            renderCards();
            showToast('Card added');
        }
    });
}

function showEditCardModal(card) {
    const state = AppState.get();
    const catOptions = ['Uncategorized', ...state.categories].map(cat =>
        `<option value="${escapeHtml(cat)}" ${card.category === cat ? 'selected' : ''}>${escapeHtml(cat)}</option>`
    ).join('');

    showModal({
        title: 'Edit Card',
        bodyHTML: `
            <div class="form-group">
                <label class="form-label">Title</label>
                <input type="text" id="editCardTitle" class="form-input" value="${escapeHtml(card.title)}">
            </div>
            <div class="form-group">
                <label class="form-label">Category</label>
                <select id="editCardCategory" class="form-select">${catOptions}</select>
            </div>
            <div class="form-group">
                <label class="form-label">Content (Preview)</label>
                <textarea id="editCardHint" class="form-textarea">${escapeHtml(card.hint)}</textarea>
            </div>
        `,
        submitText: 'Save',
        onSubmit: () => {
            const title = document.getElementById('editCardTitle').value.trim();
            const category = document.getElementById('editCardCategory').value;
            const hint = document.getElementById('editCardHint').value.trim();

            if (!title) { showToast('Please enter a title', 'error'); return; }

            card.title = title;
            card.hint = hint;
            card.category = category;
            saveCurrentWorkspace();
            closeModal();
            renderCategories();
            renderCards();
            showToast('Card updated');
        }
    });
}

// ==========================================
//  IMPORT PREVIEW
// ==========================================

export function showParsePreview(cards, category) {
    const checkboxes = cards.map((card, idx) => `
        <label class="preview-checkbox-label">
            <input type="checkbox" class="preview-checkbox" data-idx="${idx}" checked>
            <span>${escapeHtml(card.title)}</span>
        </label>
    `).join('');

    showModal({
        title: 'Review Import',
        bodyHTML: `
            <p style="margin-bottom:12px;">Found <strong>${cards.length}</strong> cards from "${escapeHtml(category)}". Select cards to import:</p>
            <div class="preview-list">${checkboxes}</div>
        `,
        submitText: 'Import Selected',
        onSubmit: () => {
            const selected = Array.from(document.querySelectorAll('.preview-checkbox:checked'))
                .map(cb => cards[parseInt(cb.dataset.idx)]);

            if (selected.length === 0) {
                showToast('No cards selected', 'error');
                return;
            }

            const state = AppState.get();
            const cats = state.categories.includes(category)
                ? state.categories
                : [...state.categories, category];

            AppState.set({
                cards: [...state.cards, ...selected],
                categories: cats
            });

            saveCurrentWorkspace();
            closeModal();
            renderCategories();
            renderCards();
            showToast(`${selected.length} cards imported`);
        }
    });
}

// ==========================================
//  TOAST NOTIFICATIONS
// ==========================================

export function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));

    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ==========================================
//  PROGRESS OVERLAY
// ==========================================

export function showProgress(message) {
    const overlay = document.getElementById('progressOverlay');
    const msg = document.getElementById('progressMessage');
    if (overlay) overlay.classList.add('active');
    if (msg) msg.textContent = message;
}

export function updateProgress(message) {
    const msg = document.getElementById('progressMessage');
    if (msg) msg.textContent = message;
}

export function hideProgress() {
    const overlay = document.getElementById('progressOverlay');
    if (overlay) overlay.classList.remove('active');
}

// ==========================================
//  HELPER: Save current workspace to storage
// ==========================================

export function saveCurrentWorkspace() {
    const state = AppState.get();
    if (!state.workspaceId) return;

    Storage.saveWorkspaceData(state.workspaceId, {
        categories: state.categories,
        cards: state.cards
    });

    Storage.upsertWorkspaceMeta({
        id: state.workspaceId,
        name: state.workspaceName,
        cardCount: state.cards.length,
        lastModified: new Date().toISOString()
    });
}
