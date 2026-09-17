import { pb, API_URL } from './pb';
import type { FileMutasi, MutasiRow } from './types';

export async function listFileMutasi(): Promise<FileMutasi[]> {
	const items = await pb
		.collection('file_mutasi')
		.getFullList<FileMutasi>({ sort: '-created', expand: 'uploaded_by' });
	items.sort(
		(a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
	);
	return items;
}

export async function listMutasiRows(fileId: string): Promise<MutasiRow[]> {
	return pb.collection('mutasi').getFullList<MutasiRow>({
		filter: `file_mutasi="${fileId}"`,
		sort: 'no_urut'
	});
}

export function fileMutasiUrl(f: FileMutasi): string | null {
	if (!f.file_pdf) return null;
	return `/api/files/${f.collectionId}/${f.id}/${f.file_pdf}`;
}

export async function uploadFileMutasi(
	file: File,
	password: string,
	bulan: string
): Promise<{ jumlah_transaksi?: number; bulan?: string; message?: string }> {
	const fd = new FormData();
	fd.append('file_pdf', file);
	fd.append('password', password);
	fd.append('bulan', bulan);

	const res = await fetch(`${API_URL}/v1/mutasi/upload`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${pb.authStore.token}` },
		body: fd
	});
	const result = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(result?.message || `HTTP ${res.status}`);
	}
	return result;
}
