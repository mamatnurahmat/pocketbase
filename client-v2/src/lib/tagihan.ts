import { pb, API_URL } from './pb';
import type { Iuran, Lampiran, Tagihan, Warga } from './types';

/** Ambil daftar tagihan sesuai role (semua warga untuk mode pengurus). */
export async function listTagihan(
	wargaId: string,
	semuaWarga: boolean
): Promise<Tagihan[]> {
	const opts: Record<string, unknown> = {
		expand: 'iuran,warga,warga.user,lampiran'
	};
	if (!semuaWarga) opts.filter = `warga="${wargaId}"`;

	const records = await pb.collection('tagihan').getFullList<Tagihan>(opts);
	records.sort(
		(a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
	);
	return records;
}

export async function listIuranKodes(): Promise<string[]> {
	const items = await pb
		.collection('iuran')
		.getFullList<Iuran>({ sort: 'kode' });
	return items.map((i) => i.kode).filter(Boolean);
}

export async function getWargaByUser(userId: string): Promise<Warga> {
	return pb.collection('warga').getFirstListItem<Warga>(`user="${userId}"`);
}

/** Panggil endpoint Flask untuk approve tagihan. */
export async function approveTagihan(id: string): Promise<{
	reference_no?: string;
	balance_before?: number;
	balance_after?: number;
}> {
	const res = await fetch(`${API_URL}/v1/tagihan/approve`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: pb.authStore.token
		},
		body: JSON.stringify({ tagihan_id: id })
	});
	if (!res.ok) {
		let msg = `HTTP ${res.status}`;
		try {
			const err = await res.json();
			if (err?.message) msg = err.message;
		} catch {
			/* ignore parse error */
		}
		throw new Error(msg);
	}
	return res.json();
}

/** Upload lampiran bukti ke Flask (multipart). */
export async function uploadLampiran(
	tagihanId: string,
	file: File
): Promise<void> {
	const fd = new FormData();
	fd.append('tagihan_id', tagihanId);
	fd.append('file_bukti', file);

	const res = await fetch(`${API_URL}/v1/tagihan/tambah-lampiran`, {
		method: 'POST',
		headers: { Authorization: pb.authStore.token },
		body: fd
	});
	if (!res.ok) {
		let msg = `HTTP ${res.status}`;
		try {
			const err = await res.json();
			if (err?.message) msg = err.message;
		} catch {
			/* ignore parse error */
		}
		throw new Error(msg);
	}
}

/** Normalisasi field lampiran (bisa single object atau array). */
export function asLampiranList(
	value: Lampiran | Lampiran[] | undefined
): Lampiran[] {
	if (!value) return [];
	return Array.isArray(value) ? value : [value];
}

export function isImageName(name: string | undefined): boolean {
	return !!name && /\.(jpg|jpeg|png|webp)$/i.test(name);
}

export function isPdfName(name: string | undefined): boolean {
	return !!name && /\.pdf$/i.test(name);
}

export function fileUrl(lmp: Lampiran): string {
	return `/api/files/${lmp.collectionId}/${lmp.id}/${lmp.file_bukti}`;
}
