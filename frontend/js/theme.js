// ===== THEME & DARK MODE =====
import { AppState } from './state.js';
import { Storage } from './storage.js';
import { showModal, closeModal } from './modal.js';

const PRESETS = {
    ocean:    { '--color-primary': '#0066cc', '--color-accent': '#ff6b35' },
    midnight: { '--color-primary': '#1a1a3e', '--color-accent': '#ffd700' },
    forest:   { '--color-primary': '#2d5016', '--color-accent': '#ff6b35' },
    sunset:   { '--color-primary': '#d62828', '--color-accent': '#f77f00' },
    arctic:   { '--color-primary': '#06a77d', '--color-accent': '#d62828' },
    rose:     { '--color-primary': '#c7184f', '--color-accent': '#ff69b4' },
    lavender: { '--color-primary': '#667bc6', '--color-accent': '#da4167' },
    gold:     { '--color-primary': '#b8860b', '--color-accent': '#ff6347' }
};

const PRESET_LABELS = {
    ocean: 'Ocean Blue', midnight: 'Midnight', forest: 'Forest', sunset: 'Sunset',
    arctic: 'Arctic', rose: 'Rose', lavender: 'Lavender', gold: 'Gold'
};

export function applyDarkMode(enabled) {
    AppState.set({ darkMode: enabled });
    Storage.setPreference('darkMode', enabled);

    if (enabled) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }

    // Update button text if it exists
    const btn = document.querySelector('[data-action="darkMode"]');
    if (btn) btn.textContent = enabled ? '☀️ Light Mode' : '🌙 Dark Mode';

    const dashBtn = document.getElementById('dashDarkModeBtn');
    if (dashBtn) dashBtn.textContent = enabled ? '☀️' : '🌙';
}

export function applyThemePreset(preset) {
    const colors = PRESETS[preset] || PRESETS.ocean;
    Object.entries(colors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
    });

    AppState.set({ currentThemePreset: preset });

    const wsId = AppState.get().workspaceId;
    if (wsId) Storage.saveWorkspaceTheme(wsId, preset);
}

export function openThemeModal() {
    const state = AppState.get();

    const presetsHTML = Object.entries(PRESET_LABELS).map(([key, label]) =>
        `<button class="preset-btn ${state.currentThemePreset === key ? 'active' : ''}" data-preset="${key}">${label}</button>`
    ).join('');

    const colorVars = [
        { key: '--color-primary', label: 'Primary Color' },
        { key: '--color-accent', label: 'Accent Color' }
    ];

    const pickersHTML = colorVars.map(({ key, label }) =>
        `<div class="color-picker-row">
            <span class="color-picker-label">${label}</span>
            <input type="color" class="color-picker-input" data-var="${key}" value="${getColorValue(key)}">
        </div>`
    ).join('');

    showModal({
        title: 'Theme & Colors',
        bodyHTML: `
            <h4 style="margin-bottom:12px;font-weight:600;">Presets</h4>
            <div class="preset-grid">${presetsHTML}</div>
            <h4 style="margin:20px 0 12px;font-weight:600;">Custom Colors</h4>
            ${pickersHTML}
        `,
        submitText: 'Done',
        onSubmit: closeModal
    });

    // Attach preset click handlers
    setTimeout(() => {
        document.querySelectorAll('.preset-btn[data-preset]').forEach(btn => {
            btn.addEventListener('click', () => {
                applyThemePreset(btn.dataset.preset);
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        document.querySelectorAll('.color-picker-input').forEach(input => {
            input.addEventListener('change', (e) => {
                document.documentElement.style.setProperty(e.target.dataset.var, e.target.value);
            });
        });
    }, 50);
}

function getColorValue(varName) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return value || '#000000';
}

export function initTheme() {
    const darkPref = Storage.getPreference('darkMode');
    applyDarkMode(darkPref === 'true');
}
