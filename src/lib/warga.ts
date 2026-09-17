import { pb } from './pb';
import type { StatusWarga, Warga } from './types';

export async function listWarga(): Promise<Warga[]> {
	return pb.collection('warga').getFullList<Warga>({
		expand: 'user,status',
		sort: 'no_rumah'
	});
}

export async function listStatus(): Promise<StatusWarga[]> {
	return pb.collection('status').getFullList<StatusWarga>({ sort: 'nama' });
}

export async function updateWarga(
	id: string,
	data: Partial<Warga>
): Promise<Warga> {
	return pb.collection('warga').update<Warga>(id, data);
}

/** Ubah nomor WA jadi format wa.me (62xxxxxxx). */
export function waLink(no: string): string {
	const clean = no.replace(/\D/g, '');
	if (clean.startsWith('0')) return `https://wa.me/62${clean.slice(1)}`;
	if (clean.startsWith('62')) return `https://wa.me/${clean}`;
	return `https://wa.me/62${clean}`;
}

export const BLOK_COLORS: Record<string, { bg: string; color: string }> = {
	A: { bg: '#E8F5EE', color: '#15935A' },
	B: { bg: '#E3F2FD', color: '#1976D2' },
	C: { bg: '#FFF3E0', color: '#E65100' },
	D: { bg: '#F3E5F5', color: '#7B1FA2' },
	E: { bg: '#FCE4EC', color: '#C62828' },
	F: { bg: '#E0F7FA', color: '#00695C' },
	G: { bg: '#F9FBE7', color: '#827717' }
};

export const AGAMA_LABEL: Record<string, string> = {
	islam: 'Islam',
	katolik: 'Katolik',
	protestan: 'Protestan',
	hindu: 'Hindu',
	budha: 'Budha',
	konghucu: 'Konghucu'
};
