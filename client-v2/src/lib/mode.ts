/**
 * Mode Pengurus — writable store yang sinkron dengan localStorage.
 *
 * Aturan (mengikuti versi React lama):
 * - Kalau `isPengurus` di localStorage tidak "true" → paksa false.
 * - Kalau pengurus dan belum pernah toggle → default true.
 * - Toggle disimpan ke localStorage supaya persist antar page/reload.
 *
 * Reaktif lintas halaman via `subscribe` — Dashboard, Tagihan, dsb bisa
 * langsung update saat toggle diubah di Profil.
 */
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const KEY = 'modePengurus';

function read(): boolean {
	if (!browser) return false;
	if (localStorage.getItem('isPengurus') !== 'true') return false;
	const saved = localStorage.getItem(KEY);
	return saved === null ? true : saved === 'true';
}

const { subscribe, set } = writable<boolean>(read());

export const modePengurus = {
	subscribe,
	set(value: boolean) {
		if (browser) localStorage.setItem(KEY, value ? 'true' : 'false');
		set(value);
	},
	toggle() {
		const next = !read();
		this.set(next);
	},
	/** Re-baca dari localStorage — panggil kalau isPengurus berubah. */
	refresh() {
		set(read());
	}
};
