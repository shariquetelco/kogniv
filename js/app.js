// ===== APP ENTRY POINT =====
// Router, event wiring, keyboard shortcuts, search overlay

import { AppState } from './state.js';
import { Storage } from './storage.js';
import { parseFile } from './parser.js';
import { initModal, showModal, closeModal } from './modal.js';
import { applyDarkMode, applyThemePreset, openThemeModal, initTheme } from './theme.js';
import { generateId, escapeHtml, debounce } from './utils.js';
import {
    renderDashboard, handleWorkspaceGridClick,
    updateWorkspaceHeader, renderCategories, renderCards,
    handleCategoryClick, handleCardGridClick,
    openSplitView, closeSplitView, handleCardListClick,
    showParsePreview, showToast, showProgress, updateProgress, hideProgress,
    saveCurrentWorkspace
} from './ui.js';

// ==========================================
//  INIT
// ==========================================

function init() {
    Storage.migrateOldData();
    initTheme();
    initModal();
    navigateTo('dashboard');
    setupGlobalEvents();
}

// ==========================================
//  VIEW ROUTER
// ==========================================

function navigateTo(view, params = {}) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    const viewEl = document.getElementById(`${view}View`);
    if (viewEl) viewEl.classList.add('active');

    AppState.set({ currentView: view });

    if (view === 'dashboard') {
        renderDashboard();
        setupDashboardEvents();
    } else if (view === 'workspace') {
        if (params.workspaceId) {
            loadWorkspace(params.workspaceId);
        }
        setupWorkspaceEvents();
    }
}

// ==========================================
//  WORKSPACE MANAGEMENT
// ==========================================

function createBlankWorkspace() {
    const id = generateId();
    AppState.set({
        workspaceId: id,
        workspaceName: 'Untitled Workspace',
        categories: [],
        cards: [],
        currentCategory: 'all',
        selectedCardId: null,
        splitViewActive: false,
        editMode: false,
        filteredCards: []
    });
    saveCurrentWorkspace();
    return id;
}

function loadWorkspace(workspaceId) {
    const data = Storage.getWorkspaceData(workspaceId);
    const workspaces = Storage.getWorkspaces();
    const wsMeta = workspaces.find(w => w.id === workspaceId);

    AppState.set({
        workspaceId,
        workspaceName: wsMeta ? wsMeta.name : 'Untitled Workspace',
        categories: data.categories,
        cards: data.cards,
        currentCategory: 'all',
        selectedCardId: null,
        splitViewActive: false,
        editMode: false,
        searchQuery: '',
        filteredCards: [],
        currentThemePreset: data.theme || 'ocean'
    });

    applyThemePreset(data.theme || 'ocean');
    updateWorkspaceHeader();
    renderCategories();
    renderCards();
}

function openWorkspace(workspaceId) {
    navigateTo('workspace', { workspaceId });
}

// ==========================================
//  DASHBOARD EVENTS
// ==========================================

function setupDashboardEvents() {
    // Upload zone
    const uploadZone = document.getElementById('dashUploadZone');
    const fileInput = document.getElementById('fileInput');

    if (uploadZone && !uploadZone._eventsAttached) {
        uploadZone.addEventListener('click', (e) => {
            if (e.target.closest('#startBlankBtn')) return;
            fileInput.click();
        });

        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });

        uploadZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            await handleDashboardUpload(Array.from(e.dataTransfer.files));
        });

        uploadZone._eventsAttached = true;
    }

    if (fileInput && !fileInput._eventsAttached) {
        fileInput.addEventListener('change', async (e) => {
            await handleDashboardUpload(Array.from(e.target.files));
            e.target.value = '';
        });
        fileInput._eventsAttached = true;
    }

    // Blank workspace
    const blankBtn = document.getElementById('startBlankBtn');
    if (blankBtn && !blankBtn._eventsAttached) {
        blankBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = createBlankWorkspace();
            navigateTo('workspace', { workspaceId: id });
        });
        blankBtn._eventsAttached = true;
    }

    // Workspace grid
    const grid = document.getElementById('workspacesGrid');
    if (grid && !grid._eventsAttached) {
        grid.addEventListener('click', (e) => handleWorkspaceGridClick(e, openWorkspace));
        grid._eventsAttached = true;
    }

    // Sort
    const sortSelect = document.getElementById('wsSortSelect');
    if (sortSelect && !sortSelect._eventsAttached) {
        sortSelect.addEventListener('change', renderDashboard);
        sortSelect._eventsAttached = true;
    }

    // Dark mode toggle on dashboard
    const darkBtn = document.getElementById('dashDarkModeBtn');
    if (darkBtn && !darkBtn._eventsAttached) {
        darkBtn.addEventListener('click', () => applyDarkMode(!AppState.get().darkMode));
        darkBtn._eventsAttached = true;
    }
}

// ==========================================
//  WORKSPACE EVENTS
// ==========================================

function setupWorkspaceEvents() {
    // Back to dashboard
    const backBtn = document.getElementById('backToDashboardBtn');
    if (backBtn && !backBtn._eventsAttached) {
        backBtn.addEventListener('click', () => {
            saveCurrentWorkspace();
            closeSplitView();
            navigateTo('dashboard');
        });
        backBtn._eventsAttached = true;
    }

    // Workspace name inline editing
    const nameEl = document.getElementById('workspaceName');
    if (nameEl && !nameEl._eventsAttached) {
        nameEl.addEventListener('click', () => {
            nameEl.contentEditable = 'true';
            nameEl.classList.add('editing');
            nameEl.focus();
            const range = document.createRange();
            range.selectNodeContents(nameEl);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
        });

        nameEl.addEventListener('blur', () => {
            nameEl.contentEditable = 'false';
            nameEl.classList.remove('editing');
            const newName = nameEl.textContent.trim() || 'Untitled Workspace';
            nameEl.textContent = newName;
            AppState.set({ workspaceName: newName });
            saveCurrentWorkspace();
        });

        nameEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                nameEl.blur();
            }
            if (e.key === 'Escape') {
                nameEl.contentEditable = 'false';
                nameEl.classList.remove('editing');
                nameEl.textContent = AppState.get().workspaceName;
            }
        });

        nameEl._eventsAttached = true;
    }

    // Search icon
    const searchBtn = document.getElementById('searchToggleBtn');
    if (searchBtn && !searchBtn._eventsAttached) {
        searchBtn.addEventListener('click', openSearchOverlay);
        searchBtn._eventsAttached = true;
    }

    // Menu dropdown
    const menuBtn = document.getElementById('menuBtn');
    const dropdown = document.getElementById('menuDropdown');
    if (menuBtn && !menuBtn._eventsAttached) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });

        dropdown.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            dropdown.classList.add('hidden');
            handleMenuAction(btn.dataset.action);
        });

        menuBtn._eventsAttached = true;
    }

    // Category bar
    const catBar = document.getElementById('categoryBar');
    if (catBar && !catBar._eventsAttached) {
        catBar.addEventListener('click', (e) => handleCategoryClick(e, renderWorkspaceView));
        catBar._eventsAttached = true;
    }

    // Card grid
    const grid = document.getElementById('cardsGrid');
    if (grid && !grid._eventsAttached) {
        grid.addEventListener('click', (e) => handleCardGridClick(e, openSplitView));
        grid._eventsAttached = true;
    }

    // Card list pane (split view)
    const listItems = document.getElementById('cardListItems');
    if (listItems && !listItems._eventsAttached) {
        listItems.addEventListener('click', handleCardListClick);
        listItems._eventsAttached = true;
    }

    // Close split view
    const closeSplitBtn = document.getElementById('closeSplitBtn');
    if (closeSplitBtn && !closeSplitBtn._eventsAttached) {
        closeSplitBtn.addEventListener('click', () => {
            closeSplitView();
            renderCards();
        });
        closeSplitBtn._eventsAttached = true;
    }

    // Upload more (workspace-local)
    const uploadMoreInput = document.getElementById('uploadMoreInput');
    if (uploadMoreInput && !uploadMoreInput._eventsAttached) {
        uploadMoreInput.addEventListener('change', async (e) => {
            await handleWorkspaceUpload(Array.from(e.target.files));
            e.target.value = '';
        });
        uploadMoreInput._eventsAttached = true;
    }

    // JSON import input
    const jsonInput = document.getElementById('jsonFileInput');
    if (jsonInput && !jsonInput._eventsAttached) {
        jsonInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                handleJsonImport(data);
            } catch (err) {
                showToast('Error parsing JSON: ' + err.message, 'error');
            }
            e.target.value = '';
        });
        jsonInput._eventsAttached = true;
    }

    // Search overlay
    const searchInput = document.getElementById('searchInput');
    if (searchInput && !searchInput._eventsAttached) {
        searchInput.addEventListener('input', debounce((e) => {
            performSearch(e.target.value);
        }, 250));
        searchInput._eventsAttached = true;
    }

    const searchOverlay = document.getElementById('searchOverlay');
    if (searchOverlay && !searchOverlay._eventsAttached) {
        searchOverlay.addEventListener('click', (e) => {
            if (e.target === searchOverlay) closeSearchOverlay();
        });
        searchOverlay._eventsAttached = true;
    }
}

function renderWorkspaceView() {
    renderCategories();
    renderCards();
}

// ==========================================
//  MENU ACTIONS
// ==========================================

function handleMenuAction(action) {
    switch (action) {
        case 'editMode':
            const state = AppState.get();
            AppState.set({ editMode: !state.editMode });
            renderWorkspaceView();
            const editItem = document.querySelector('[data-action="editMode"]');
            if (editItem) editItem.textContent = AppState.get().editMode ? '✏️ Exit Edit Mode' : '✏️ Edit Mode';
            break;
        case 'theme':
            openThemeModal();
            break;
        case 'darkMode':
            applyDarkMode(!AppState.get().darkMode);
            break;
        case 'exportPdf':
            exportToPdf();
            break;
        case 'exportJson':
            exportToJson();
            break;
        case 'importJson':
            document.getElementById('jsonFileInput').click();
            break;
        case 'uploadMore':
            document.getElementById('uploadMoreInput').click();
            break;
    }
}

// ==========================================
//  FILE UPLOAD
// ==========================================

async function handleDashboardUpload(files) {
    if (files.length === 0) return;

    const id = createBlankWorkspace();
    navigateTo('workspace', { workspaceId: id });

    showProgress(`Processing ${files.length} file(s)...`);

    for (const file of files) {
        updateProgress(`Parsing ${file.name}...`);
        const result = await parseFile(file);
        if (result.error) {
            showToast(`Error parsing ${file.name}: ${result.error}`, 'error');
            continue;
        }
        if (result.cards.length > 0) {
            hideProgress();
            showParsePreview(result.cards, result.category);
        }
    }

    hideProgress();
}

async function handleWorkspaceUpload(files) {
    if (files.length === 0) return;

    showProgress(`Processing ${files.length} file(s)...`);

    for (const file of files) {
        updateProgress(`Parsing ${file.name}...`);
        const result = await parseFile(file);
        if (result.error) {
            showToast(`Error parsing ${file.name}: ${result.error}`, 'error');
            continue;
        }
        if (result.cards.length > 0) {
            hideProgress();
            showParsePreview(result.cards, result.category);
        }
    }

    hideProgress();
}

// ==========================================
//  EXPORT
// ==========================================

function exportToPdf() {
    const state = AppState.get();
    const cards = state.filteredCards.length > 0 ? state.filteredCards : state.cards;

    if (cards.length === 0) {
        showToast('No cards to export', 'error');
        return;
    }

    const element = document.createElement('div');
    element.style.padding = '20px';
    element.style.fontFamily = 'Arial, sans-serif';

    cards.forEach((card, idx) => {
        element.innerHTML += `
            <div style="margin-bottom:30px;page-break-inside:avoid;">
                <div style="background:#f0f0f0;padding:10px;margin-bottom:10px;border-radius:4px;">
                    <strong>${escapeHtml(card.category)}</strong>
                </div>
                <h2 style="margin:10px 0;">${escapeHtml(card.title)}</h2>
                <div style="line-height:1.6;color:#333;">${card.content}</div>
                ${idx < cards.length - 1 ? '<hr style="margin:30px 0;border:none;border-top:1px solid #ddd;">' : ''}
            </div>
        `;
    });

    const opt = {
        margin: 10,
        filename: `${state.workspaceName || 'cards'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
    showToast('PDF export started');
}

function exportToJson() {
    const state = AppState.get();
    const data = {
        workspaceName: state.workspaceName,
        categories: state.categories,
        cards: state.cards,
        exportedAt: new Date().toISOString()
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.workspaceName || 'workspace'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('JSON exported');
}

function handleJsonImport(data) {
    if (!data.cards || !Array.isArray(data.cards)) {
        showToast('Invalid JSON format', 'error');
        return;
    }

    const state = AppState.get();
    const importedCategories = data.categories || [];
    const newCategories = importedCategories.filter(cat => !state.categories.includes(cat));

    // Also collect categories from cards themselves
    const cardCategories = [...new Set(data.cards.map(c => c.category).filter(Boolean))];
    const extraCats = cardCategories.filter(cat => !state.categories.includes(cat) && !newCategories.includes(cat));

    AppState.set({
        categories: [...state.categories, ...newCategories, ...extraCats],
        cards: [...state.cards, ...data.cards]
    });

    saveCurrentWorkspace();
    renderWorkspaceView();
    showToast(`Imported ${data.cards.length} cards`);
}

// ==========================================
//  SEARCH OVERLAY
// ==========================================

function openSearchOverlay() {
    const overlay = document.getElementById('searchOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        const input = document.getElementById('searchInput');
        if (input) {
            input.value = '';
            input.focus();
        }
        document.getElementById('searchResults').innerHTML = '';
    }
}

function closeSearchOverlay() {
    const overlay = document.getElementById('searchOverlay');
    if (overlay) overlay.classList.add('hidden');
}

function performSearch(query) {
    const results = document.getElementById('searchResults');
    if (!results) return;

    if (!query.trim()) {
        results.innerHTML = '<div class="search-empty">Type to search across all cards...</div>';
        return;
    }

    const state = AppState.get();
    const q = query.toLowerCase();
    const matches = state.cards.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.hint.toLowerCase().includes(q) ||
        c.content.toLowerCase().includes(q)
    );

    if (matches.length === 0) {
        results.innerHTML = '<div class="search-empty">No results found</div>';
        return;
    }

    results.innerHTML = matches.map(card => {
        const titleHL = highlightMatch(card.title, query);
        const snippet = getSnippet(card.content.replace(/<[^>]*>/g, ''), query);
        return `
            <div class="search-result-item" data-search-card-id="${card.id}">
                <div class="search-result-title">${titleHL}</div>
                <div class="search-result-snippet">${snippet}</div>
            </div>
        `;
    }).join('');

    // Click result → open in split view
    results.onclick = (e) => {
        const item = e.target.closest('[data-search-card-id]');
        if (!item) return;
        const card = state.cards.find(c => c.id === item.dataset.searchCardId);
        if (card) {
            closeSearchOverlay();
            const filtered = AppState.getFilteredCards();
            openSplitView(card, filtered.length > 0 ? filtered : state.cards);
        }
    };
}

function highlightMatch(text, query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escapeHtml(text).replace(
        new RegExp(escaped, 'gi'),
        match => `<span class="search-highlight">${match}</span>`
    );
}

function getSnippet(text, query, maxLen = 120) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(text.substring(0, maxLen)) + '...';
    const start = Math.max(0, idx - 40);
    const end = Math.min(text.length, idx + 80);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < text.length ? '...' : '';
    return prefix + highlightMatch(text.substring(start, end), query) + suffix;
}

// ==========================================
//  GLOBAL EVENTS
// ==========================================

function setupGlobalEvents() {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+S or Ctrl+K → search
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'k')) {
            e.preventDefault();
            if (AppState.get().currentView === 'workspace') {
                openSearchOverlay();
            }
        }

        // Escape
        if (e.key === 'Escape') {
            closeSearchOverlay();
            closeModal();
        }
    });

    // Close menu dropdown on outside click
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('menuDropdown');
        if (dropdown && !e.target.closest('.menu-dropdown-wrapper')) {
            dropdown.classList.add('hidden');
        }
    });
}

// ==========================================
//  START
// ==========================================

document.addEventListener('DOMContentLoaded', init);
