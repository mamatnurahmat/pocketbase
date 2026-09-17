import { pb } from './pb';
import type { Ledger, Wallet } from './types';

export async function getWalletById(id: string): Promise<Wallet> {
	return pb.collection('wallets').getOne<Wallet>(id, { expand: 'user' });
}

/**
 * Ambil ledger untuk sebuah wallet dengan expand transaction & created_by.
 * Filter tipe & tanggal dilakukan di client (sesuai versi React lama —
 * field `created` di ledger tidak konsisten).
 */
export async function listLedgersForWallet(walletId: string): Promise<Ledger[]> {
	return pb.collection('ledgers').getFullList<Ledger>({
		filter: `wallet="${walletId}"`,
		sort: '-created',
		expand: 'transaction,transaction.created_by'
	});
}

export function extractWargaCode(note?: string): string | null {
	if (!note) return null;
	const m = note.match(/#tag([a-z0-9]{3})/);
	return m ? m[1].toUpperCase() : null;
}

/** Bersihkan noise di note (tag id, remap Juli, dst.) untuk ditampilkan. */
export function cleanNote(note?: string): string {
	if (!note) return '';
	return (
		note
			.replace(/#tag[a-z0-9]{15}/g, '')
			.replace(/\(remapped ke Juli\)/g, '')
			.replace(/→ KAS/g, '')
			.replace(/Auto topup dari tagihan /g, '')
			.replace(/^\s*[·]\s*/, '')
			.trim() || note
	);
}

export interface TxVisual {
	icon: string;
	color: string;
	label: string;
}

export function txVisual(
	type: string | undefined,
	entry: string | undefined
): TxVisual {
	const t = type || '';
	const label = entry === 'CREDIT' ? 'Masuk' : entry === 'DEBIT' ? 'Keluar' : '-';
	let icon = '💳';
	let color = '#6B7B72';
	if (t === 'TOPUP' || t === 'IURAN') {
		icon = '📥';
		color = '#15935A';
	} else if (t === 'PENGELUARAN' || t === 'WITHDRAWAL') {
		icon = '📤';
		color = t === 'WITHDRAWAL' ? '#E68A2E' : '#C24A4A';
	} else if (t === 'TRANSFER') {
		icon = '🔄';
		color = '#2563EB';
	} else if (t === 'REVERSAL') {
		icon = '↩️';
		color = '#8A9991';
	}
	return { icon, color, label };
}

/** Format saldo dengan mask sentinel (< 1 → 0). */
export function fmtSaldo(n: number | undefined | null): string {
	let v = n ?? 0;
	if (v < 1 && v > 0) v = 0;
	return 'Rp ' + v.toLocaleString('id-ID');
}
