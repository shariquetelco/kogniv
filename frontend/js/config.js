// ===== KOGNIV CONFIGURATION =====
// Public config only — NO secrets here
// Database password and service_role key must NEVER be in frontend code

export const CONFIG = {
    // App
    APP_NAME: 'KOGNIV',
    APP_VERSION: '1.0.0',

    // Supabase (public anon key is safe for frontend)
    SUPABASE_URL: 'https://bmnvzddldajbhogovcvb.supabase.co',
    SUPABASE_ANON_KEY: '', // Will be set when auth is implemented

    // Storage mode: 'local' or 'supabase'
    // Switch to 'supabase' when backend is ready
    STORAGE_MODE: 'local',

    // Feature flags
    FEATURES: {
        AUTH_ENABLED: false,
        AI_ENABLED: false,
        REALTIME_SYNC: false
    }
};
