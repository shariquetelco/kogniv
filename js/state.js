// ===== STATE MANAGEMENT =====
// Centralized app state with pub/sub for reactive updates

const _state = {
    currentView: 'dashboard',
    workspaceId: null,
    workspaceName: 'Untitled Workspace',
    categories: [],
    cards: [],
    currentCategory: 'all',
    selectedCardId: null,
    splitViewActive: false,
    editMode: false,
    darkMode: false,
    searchQuery: '',
    currentThemePreset: 'ocean',
    filteredCards: []
};

const _subscribers = [];

export const AppState = {
    get() {
        return { ..._state };
    },

    set(partial) {
        Object.assign(_state, partial);
        _subscribers.forEach(fn => {
            try { fn(_state); } catch (e) { console.error('State subscriber error:', e); }
        });
    },

    subscribe(fn) {
        _subscribers.push(fn);
        return () => {
            const idx = _subscribers.indexOf(fn);
            if (idx >= 0) _subscribers.splice(idx, 1);
        };
    },

    // Computed: get filtered cards based on current category + search
    getFilteredCards() {
        let cards = _state.cards;

        if (_state.currentCategory !== 'all') {
            cards = cards.filter(c => c.category === _state.currentCategory);
        }

        if (_state.searchQuery) {
            const q = _state.searchQuery.toLowerCase();
            cards = cards.filter(c =>
                c.title.toLowerCase().includes(q) ||
                c.hint.toLowerCase().includes(q) ||
                c.content.toLowerCase().includes(q)
            );
        }

        return cards;
    }
};
