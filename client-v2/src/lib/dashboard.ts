import { pb } from './pb';
import type {
	AbsenScurityInfo,
	FileMutasi,
	LaporanScurity,
	MutasiRow,
	Tagihan,
	Wallet,
	Warga
} from './types';

/** Ambil warga terikat user login. */
export async function getMyWarga(userId: string): Promise<Warga> {
	return pb.collection('warga').getFirstListItem<Warga>(`user="${userId}"`);
}

/** Ambil tagihan untuk dashboard (mode pengurus = semua, selainnya = milik warga). */
export async function listTagihanForDashboard(
	wargaId: string,
	semuaWarga: boolean
): Promise<Tagihan[]> {
	const opts: Record<string, unknown> = { expand: 'iuran' };
	if (!semuaWarga) opts.filter = `warga="${wargaId}"`;
	return pb.collection('tagihan').getFullList<Tagihan>(opts);
}

/** Wallet pribadi user login. */
export async function getWalletPribadi(userId: string): Promise<Wallet | null> {
	const list = await pb.collection('wallets').getFullList<Wallet>({
		filter: pb.filter('user = {:u}', { u: userId })
	});
	return list.find((w) => w.wallet_type === 'PERSONAL') ?? null;
}

/**
 * Wallet KAS. Coba filter langsung dulu; kalau kosong, fallback list all
 * lalu cari client-side (defensif terhadap perbedaan casing / encoding).
 */
export async function getWalletKas(): Promise<Wallet | null> {
	// 1) filter langsung
	try {
		const list = await pb.collection('wallets').getFullList<Wallet>({
			filter: pb.filter('wallet_type = {:t}', { t: 'KAS' }),
			expand: 'user'
		});
		if (list.length > 0) return list[0];
	} catch (e) {
		console.warn('getWalletKas filter query failed:', e);
	}

	// 2) fallback — ambil semua wallet yang user berhak lihat, cari KAS
	try {
		const all = await pb
			.collection('wallets')
			.getFullList<Wallet>({ expand: 'user' });
		return all.find((w) => (w.wallet_type || '').toUpperCase() === 'KAS') ?? null;
	} catch (e) {
		console.warn('getWalletKas fallback failed:', e);
		return null;
	}
}

/** Scurity terakhir absen — lookup nama (users) & no_hp (scurity). */
export async function getLastAbsenScurity(): Promise<AbsenScurityInfo | null> {
	const res = await pb.collection('laporan_scurity').getList<LaporanScurity>(1, 1, {
		filter: 'jenis = "absen"',
		sort: '-tanggal'
	});
	if (res.items.length === 0) return null;
	const l = res.items[0];
	const userId = l.dibuat_oleh;
	if (!userId) return null;

	// Nama dari users
	let nama = 'Scurity';
	let noHp = '-';
	try {
		const u = await pb.collection('users').getOne<{ name?: string; username?: string }>(userId);
		nama = u.name || u.username || 'Scurity';
	} catch {
		/* ignore */
	}
	// no_hp + nama override dari scurity collection kalau ada
	try {
		const sc = await pb
			.collection('scurity')
			.getFirstListItem<{ nama?: string; no_hp?: string }>(`user="${userId}"`);
		if (sc.nama) nama = sc.nama;
		if (sc.no_hp) noHp = sc.no_hp;
	} catch {
		/* ignore */
	}
	return { nama, no_hp: noHp };
}

/** File mutasi terbaru + baris pertama (untuk quick view di dashboard pengurus). */
export async function getMutasiQuick(): Promise<{
	files: FileMutasi[];
	rows: MutasiRow[];
}> {
	const files = await pb
		.collection('file_mutasi')
		.getFullList<FileMutasi>({ sort: '-created' });
	if (files.length === 0) return { files: [], rows: [] };
	const rows = await pb.collection('mutasi').getFullList<MutasiRow>({
		filter: `file_mutasi="${files[0].id}"`,
		sort: '-no_urut'
	});
	return { files, rows: rows.slice(0, 8) };
}
