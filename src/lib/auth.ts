import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { pb } from './pb';
import type { Warga, Scurity } from './types';

// Stores untuk role — sinkron dengan localStorage supaya kompatibel dengan
// perilaku lama (Sidebar/BottomNav React membaca localStorage langsung).
export const isPengurus = writable<boolean>(readFlag('isPengurus'));
export const isScurity = writable<boolean>(readFlag('isScurity'));

function readFlag(key: string): boolean {
	if (!browser) return false;
	return localStorage.getItem(key) === 'true';
}

function writeFlag(key: string, value: boolean): void {
	if (!browser) return;
	if (value) localStorage.setItem(key, 'true');
	else localStorage.setItem(key, 'false');
}

export const authValid = writable<boolean>(pb.authStore.isValid);

if (browser) {
	pb.authStore.onChange(() => authValid.set(pb.authStore.isValid));
}

export const displayName = derived(authValid, () => {
	const rec = pb.authStore.record;
	if (!rec) return '';
	return (rec.email as string)?.split('@')[0] || '';
});

/** Cek apakah user login adalah scurity (record ada di collection `scurity`). */
export async function checkScurity(): Promise<boolean> {
	const user = pb.authStore.record;
	if (!user) return false;
	try {
		await pb
			.collection('scurity')
			.getFirstListItem<Scurity>(`user="${user.id}"`);
		return true;
	} catch {
		return false;
	}
}

/** Cek apakah user login adalah pengurus (kolom `warga.pengurus`). */
export async function checkPengurus(): Promise<boolean> {
	const user = pb.authStore.record;
	if (!user) return false;
	try {
		const w = await pb
			.collection('warga')
			.getFirstListItem<Warga>(`user="${user.id}"`);
		return !!w.pengurus;
	} catch {
		return false;
	}
}

/**
 * Login pakai email format `kode_rumah@warga.local`.
 * Setelah sukses, set flag `isPengurus` & `isScurity` di localStorage
 * (kompatibel dengan Sidebar/BottomNav).
 */
export async function login(email: string, password: string): Promise<void> {
	const id = email.trim().toLowerCase();
	if (!/^[a-z0-9]{2,5}@warga\.local$/.test(id)) {
		throw new Error(
			'Email tidak valid. Gunakan format: kode rumah @warga.local (contoh: c09@warga.local).'
		);
	}
	await pb.collection('users').authWithPassword(id, password);
	const [peng, sc] = await Promise.all([checkPengurus(), checkScurity()]);
	writeFlag('isPengurus', peng);
	writeFlag('isScurity', sc);
	isPengurus.set(peng);
	isScurity.set(sc);
}

export function logout(): void {
	pb.authStore.clear();
	if (browser) {
		localStorage.removeItem('isPengurus');
		localStorage.removeItem('isScurity');
	}
	isPengurus.set(false);
	isScurity.set(false);
}

export function currentAuthValid(): boolean {
	return get(authValid);
}
