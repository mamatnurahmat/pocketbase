import PocketBase from 'pocketbase';

// We use relative path '/' because the React app is served by PocketBase itself
// If developing locally on a different port (like 5173), we set up a proxy in vite.config.js
export const pb = new PocketBase('/');

// API endpoint untuk operasi backend (Flask)
export const API_URL = 'https://api.sawangan.web.id';

// Optional: you can turn off autoCancellation if you prefer
pb.autoCancellation(false);
