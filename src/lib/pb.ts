import PocketBase from 'pocketbase';
import { browser } from '$app/environment';

/**
 * URL PocketBase public.
 * Diambil dari env `PUBLIC_PB_URL` saat build; default ke Prestige 2 production
 * agar dev-mode langsung terhubung ke API public sesuai permintaan.
 */
const PB_URL =
	(import.meta.env.PUBLIC_PB_URL as string | undefined) ||
	'https://prestige2.sawangan.web.id';

/** URL Flask API (upload bukti bayar, iuran, dst.) */
export const API_URL =
	(import.meta.env.PUBLIC_API_URL as string | undefined) ||
	'https://api.sawangan.web.id';

export const pb = new PocketBase(PB_URL);

// Autocancel dimatikan agar beberapa request bisa berjalan paralel
// (sesuai pola lama; sinkron dengan client React).
pb.autoCancellation(false);

// ── Dev Mode ─────────────────────────────────────────────────
// Ketika dev-mode aktif, collection dibungkus dengan prefix `dev_` supaya
// pengurus bisa uji data terpisah dari produksi.

const DEV_MODE_KEY = 'devMode';

export function isDevMode(): boolean {
	if (!browser) return false;
	return localStorage.getItem(DEV_MODE_KEY) === 'true';
}

export function setDevMode(active: boolean): void {
	if (!browser) return;
	if (active) localStorage.setItem(DEV_MODE_KEY, 'true');
	else localStorage.removeItem(DEV_MODE_KEY);
}

export function getCollectionName(name: string): string {
	// Collection yang TIDAK ikut dev-mode
	const excludeDev = ['users', 'warga', '_superusers'];
	if (excludeDev.includes(name)) return name;
	return isDevMode() ? `dev_${name}` : name;
}

/** Bungkus `pb.collection()` supaya otomatis pakai prefix `dev_` bila aktif. */
export function applyDevMode(): void {
	const original = pb.collection.bind(pb);
	// Override method internal SDK — cast ke `unknown` supaya TS terima.
	(pb as unknown as { collection: (name: string) => ReturnType<typeof original> }).collection = (
		name: string
	) => original(getCollectionName(name));
}

if (browser && isDevMode()) {
	applyDevMode();
}
