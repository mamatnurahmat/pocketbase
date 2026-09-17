import { writable } from 'svelte/store';

// ───────────────────────────── Toast ─────────────────────────────

export interface Toast {
	id: number;
	text: string;
	kind: 'ok' | 'err' | 'info';
}

export const toasts = writable<Toast[]>([]);
let toastId = 0;

export function toast(text: string, kind: Toast['kind'] = 'info'): void {
	const id = ++toastId;
	toasts.update((list) => [...list, { id, text, kind }]);
	setTimeout(
		() => toasts.update((list) => list.filter((t) => t.id !== id)),
		3200
	);
}

// ─────────────────────────── Formatter ───────────────────────────

const MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'Mei',
	'Jun',
	'Jul',
	'Agu',
	'Sep',
	'Okt',
	'Nov',
	'Des'
];

function parse(value: string | undefined | null): Date | null {
	if (!value) return null;
	let str = value.includes('T') ? value : value.replace(' ', 'T');
	if (!str.endsWith('Z') && !str.includes('+') && !str.match(/-\d\d:\d\d$/)) {
		str += 'Z';
	}
	const d = new Date(str);
	return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtDate(value: string | undefined | null): string {
	const d = parse(value);
	if (!d) return '—';
	return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDateTime(value: string | undefined | null): string {
	const d = parse(value);
	if (!d) return '—';
	const hh = String(d.getHours()).padStart(2, '0');
	const mm = String(d.getMinutes()).padStart(2, '0');
	return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

export function timeAgo(value: string | undefined | null): string {
	const d = parse(value);
	if (!d) return '—';
	const sec = Math.floor((Date.now() - d.getTime()) / 1000);
	if (sec < 0) return fmtDate(value);
	if (sec < 60) return 'baru saja';
	if (sec < 3600) return `${Math.floor(sec / 60)} mnt lalu`;
	if (sec < 86400) return `${Math.floor(sec / 3600)} jam lalu`;
	if (sec < 604800) return `${Math.floor(sec / 86400)} hari lalu`;
	return fmtDate(value);
}

export function fmtRupiah(n: number | undefined | null): string {
	if (n === undefined || n === null || Number.isNaN(n)) return '—';
	return 'Rp ' + n.toLocaleString('id-ID');
}

export function initialsOf(name: string): string {
	return (
		name
			.split(/[\s._/-]+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((p) => p[0]?.toUpperCase() ?? '')
			.join('') || '?'
	);
}
