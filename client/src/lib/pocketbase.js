import PocketBase from 'pocketbase';

// We use relative path '/' because the React app is served by PocketBase itself
// If developing locally on a different port (like 5173), we set up a proxy in vite.config.js
export const pb = new PocketBase('/');

// API endpoint untuk operasi backend (Flask)
export const API_URL = 'https://api.sawangan.web.id';

// Optional: you can turn off autoCancellation if you prefer
pb.autoCancellation(false);

// ── Dev Mode ─────────────────────────────────────────────────
// Ketika dev mode aktif, semua akses collection akan menggunakan prefix "dev_"
// Hanya pengurus yang bisa mengaktifkan dev mode

const DEV_MODE_KEY = 'devMode';

/** Cek apakah dev mode aktif */
export const isDevMode = () => {
  return localStorage.getItem(DEV_MODE_KEY) === 'true';
};

/** Set dev mode (true/false) */
export const setDevMode = (active) => {
  if (active) {
    localStorage.setItem(DEV_MODE_KEY, 'true');
  } else {
    localStorage.removeItem(DEV_MODE_KEY);
  }
};

/**
 * Dapatkan nama collection dengan prefix dev_ jika dev mode aktif
 * Contoh: getCollectionName('tagihan') -> 'dev_tagihan' (jika dev mode)
 *                       atau -> 'tagihan' (jika produksi)
 */
export const getCollectionName = (name) => {
  // Collection yang TIDAK ikut dev mode (users & warga tetap produksi)
  const excludeDev = ['users', 'warga', '_superusers'];
  if (excludeDev.includes(name)) return name;

  return isDevMode() ? `dev_${name}` : name;
};

/**
 * Override collection() untuk otomatis pakai dev_ prefix
 * Panggil setelah setDevMode()
 */
export const applyDevMode = () => {
  const originalCollection = pb.collection.bind(pb);
  pb.collection = (name) => {
    return originalCollection(getCollectionName(name));
  };
};

// Apply dev mode on load (jika sudah diset sebelumnya)
if (isDevMode()) {
  applyDevMode();
}