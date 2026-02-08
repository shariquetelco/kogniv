// ===== STORAGE ABSTRACTION LAYER =====
// localStorage today, Supabase tomorrow — only this file changes

export const Storage = {
    // ----- Workspace Index -----
    getWorkspaces() {
        return JSON.parse(localStorage.getItem('skb_workspaces') || '[]');
    },

    saveWorkspaces(list) {
        localStorage.setItem('skb_workspaces', JSON.stringify(list));
    },

    upsertWorkspaceMeta(meta) {
        const list = this.getWorkspaces();
        const idx = list.findIndex(w => w.id === meta.id);
        if (idx >= 0) {
            list[idx] = { ...list[idx], ...meta };
        } else {
            list.push(meta);
        }
        this.saveWorkspaces(list);
    },

    // ----- Per-Workspace Data -----
    getWorkspaceData(id) {
        return {
            categories: JSON.parse(localStorage.getItem(`skb_ws_${id}_cat`) || '[]'),
            cards: JSON.parse(localStorage.getItem(`skb_ws_${id}_data`) || '[]'),
            theme: localStorage.getItem(`skb_ws_${id}_theme`) || 'ocean'
        };
    },

    saveWorkspaceData(id, { categories, cards }) {
        localStorage.setItem(`skb_ws_${id}_cat`, JSON.stringify(categories));
        localStorage.setItem(`skb_ws_${id}_data`, JSON.stringify(cards));
    },

    saveWorkspaceTheme(id, theme) {
        localStorage.setItem(`skb_ws_${id}_theme`, theme);
    },

    deleteWorkspace(id) {
        const list = this.getWorkspaces().filter(w => w.id !== id);
        this.saveWorkspaces(list);
        localStorage.removeItem(`skb_ws_${id}_cat`);
        localStorage.removeItem(`skb_ws_${id}_data`);
        localStorage.removeItem(`skb_ws_${id}_theme`);
    },

    // ----- Starred -----
    setStarred(id, starred) {
        const list = this.getWorkspaces();
        const ws = list.find(w => w.id === id);
        if (ws) {
            ws.starred = starred;
            this.saveWorkspaces(list);
        }
    },

    // ----- Global Preferences -----
    getPreference(key) {
        return localStorage.getItem(`skb_pref_${key}`);
    },

    setPreference(key, value) {
        localStorage.setItem(`skb_pref_${key}`, String(value));
    },

    // ----- Migration: read old keys if they exist -----
    migrateOldData() {
        const oldWorkspaces = JSON.parse(localStorage.getItem('skb_workspaces') || '[]');
        if (oldWorkspaces.length === 0) return;

        // Check if already migrated
        if (localStorage.getItem('skb_migrated') === 'true') return;

        oldWorkspaces.forEach(ws => {
            const oldCat = localStorage.getItem(`skb_workspace_${ws.id}_categories`);
            const oldData = localStorage.getItem(`skb_workspace_${ws.id}_data`);
            const oldTheme = localStorage.getItem(`skb_workspace_${ws.id}_theme`);

            if (oldCat && !localStorage.getItem(`skb_ws_${ws.id}_cat`)) {
                localStorage.setItem(`skb_ws_${ws.id}_cat`, oldCat);
            }
            if (oldData && !localStorage.getItem(`skb_ws_${ws.id}_data`)) {
                localStorage.setItem(`skb_ws_${ws.id}_data`, oldData);
            }
            if (oldTheme && !localStorage.getItem(`skb_ws_${ws.id}_theme`)) {
                localStorage.setItem(`skb_ws_${ws.id}_theme`, oldTheme);
            }
        });

        // Keep old darkMode preference
        const oldDark = localStorage.getItem('skb_darkMode');
        if (oldDark && !localStorage.getItem('skb_pref_darkMode')) {
            localStorage.setItem('skb_pref_darkMode', oldDark);
        }

        localStorage.setItem('skb_migrated', 'true');
    }
};
