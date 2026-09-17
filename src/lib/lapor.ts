import { pb } from './pb';
import type { Lapor, Warga } from './types';

export async function listLaporWarga(): Promise<Lapor[]> {
	return pb.collection('lapor').getFullList<Lapor>({
		expand: 'warga,warga.user',
		sort: '-created'
	});
}

export async function updateLapor(
	id: string,
	data: { status?: string; respons?: string }
): Promise<Lapor> {
	return pb.collection('lapor').update<Lapor>(id, data);
}

/** Filter laporan sesuai role: warga biasa hanya lihat non-menunggu atau miliknya. */
export function filterLaporForRole(
	list: Lapor[],
	me: Warga | null
): Lapor[] {
	if (!me || me.pengurus) return list;
	return list.filter(
		(it) => it.status !== 'Menunggu Konfirmasi' || it.warga === me.id
	);
}

/**
 * Kirim laporan sebagai warga (form-data, upload foto).
 * Sekaligus catat aktivitas ke `aktivitas_warga` (best effort).
 */
export async function submitLaporWarga(
	warga: Warga,
	keterangan: string,
	foto: File
): Promise<Lapor> {
	const fd = new FormData();
	fd.append('warga', warga.id);
	fd.append('keterangan', keterangan);
	fd.append('foto', foto);
	fd.append('status', 'Menunggu Konfirmasi');
	const rec = await pb.collection('lapor').create<Lapor>(fd);

	// Best-effort log — jangan blokir kalau gagal.
	try {
		const preview =
			keterangan.length > 50 ? keterangan.slice(0, 47) + '…' : keterangan;
		const detail =
			`Tujuan Koleksi: lapor\nID Record: ${rec.id}\n` +
			`Oleh: Warga ${warga.no_rumah || '-'}\n` +
			`Waktu: ${new Date().toLocaleString('id-ID')}\n` +
			`Keterangan: Laporan - ${preview}`;
		await pb.collection('aktivitas_warga').create({
			warga: warga.id,
			aktivitas: 'Membuat Laporan',
			detail
		});
	} catch (e) {
		console.warn('Gagal catat aktivitas:', e);
	}

	return rec;
}

/** Kirim laporan sebagai scurity (jenis: absen/patroli/lainnya). */
export async function submitLaporScurity(
	userId: string,
	jenis: string,
	keteranganFinal: string,
	foto: File
): Promise<void> {
	const fd = new FormData();
	fd.append('jenis', jenis);
	fd.append('keterangan', keteranganFinal);
	fd.append('foto', foto);
	fd.append('dibuat_oleh', userId);
	await pb.collection('laporan_scurity').create(fd);
}

export function laporFotoUrl(l: Lapor, thumb?: string): string {
	const q = thumb ? `?thumb=${thumb}` : '';
	return `/api/files/${l.collectionId}/${l.id}/${l.foto}${q}`;
}
