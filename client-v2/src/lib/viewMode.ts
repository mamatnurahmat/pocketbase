import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type ViewMode = 'phone' | 'desktop';

const { subscribe, set, update } = writable<ViewMode>('phone');

export const viewMode = {
	subscribe,
	init() {
		if (!browser) return;
		const stored = localStorage.getItem('view-mode') as ViewMode | null;
		set(stored ?? (window.innerWidth >= 768 ? 'desktop' : 'phone'));
	},
	toggle() {
		update((m) => {
			const next: ViewMode = m === 'phone' ? 'desktop' : 'phone';
			localStorage.setItem('view-mode', next);
			return next;
		});
	},
	setMode(mode: ViewMode) {
		localStorage.setItem('view-mode', mode);
		set(mode);
	}
};
