import { writable } from 'svelte/store';
import { pb } from './pb';
import type { Warga, Scurity } from './types';

const IDLE_TIMEOUT = 60_000; // 1 menit — samakan dengan versi lama

export const locked = writable<boolean>(false);
export const wargaPin = writable<string | null>(null);

let timer: ReturnType<typeof setTimeout> | undefined;
let installed = false;

export async function loadPin(): Promise<void> {
	if (!pb.authStore.isValid) return;
	const user = pb.authStore.record;
	if (!user) return;
	try {
		const w = await pb
			.collection('warga')
			.getFirstListItem<Warga>(`user="${user.id}"`);
		wargaPin.set(w.pin || '666666');
		return;
	} catch {
		/* bukan warga, coba scurity */
	}
	try {
		const s = await pb
			.collection('scurity')
			.getFirstListItem<Scurity>(`user="${user.id}"`);
		wargaPin.set(s.pin || '666666');
		return;
	} catch {
		/* bukan scurity */
	}
	wargaPin.set('666666');
}

function resetTimer(): void {
	if (timer) clearTimeout(timer);
	if (!pb.authStore.isValid) return;
	timer = setTimeout(() => {
		if (pb.authStore.isValid) locked.set(true);
	}, IDLE_TIMEOUT);
}

/** Panggil sekali di layout root untuk memasang listener aktivitas. */
export function installIdle(): () => void {
	if (installed) return () => {};
	installed = true;
	const events: (keyof WindowEventMap)[] = [
		'mousedown',
		'touchstart',
		'keydown',
		'scroll',
		'mousemove',
		'wheel'
	];
	const handler = () => resetTimer();
	events.forEach((e) =>
		window.addEventListener(e, handler, { passive: true } as AddEventListenerOptions)
	);
	resetTimer();
	return () => {
		installed = false;
		events.forEach((e) => window.removeEventListener(e, handler));
		if (timer) clearTimeout(timer);
	};
}

export function unlock(): void {
	locked.set(false);
	resetTimer();
}
