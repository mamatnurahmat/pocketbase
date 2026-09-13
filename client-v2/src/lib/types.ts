import type { RecordModel } from 'pocketbase';

export interface Warga extends RecordModel {
	nama?: string;
	no_rumah?: string;
	no_hp?: string;
	no_wa?: string;
	agama?: string;
	status?: string;
	pin?: string;
	pengurus?: boolean;
	user: string;
	expand?: {
		user?: { id: string; name?: string; email?: string };
		status?: StatusWarga;
	};
}

export interface StatusWarga extends RecordModel {
	nama?: string;
	jumlah_iuran?: number;
}

export interface Scurity extends RecordModel {
	nama?: string;
	pin?: string;
	user: string;
}

export interface Iuran extends RecordModel {
	kode: string;
	nominal?: number;
	keterangan?: string;
}

export interface Lampiran extends RecordModel {
	tagihan?: string;
	iuran?: string;
	warga?: string;
	file_bukti?: string;
}

export type TagihanStatus =
	| 'Belum Dibayar'
	| 'Menunggu Konfirmasi'
	| 'Lunas'
	| string;

export interface Tagihan extends RecordModel {
	warga: string;
	iuran?: string;
	nominal?: number;
	status_pembayaran?: TagihanStatus;
	jatuh_tempo?: string;
	expand?: {
		iuran?: Iuran;
		warga?: Warga;
		lampiran?: Lampiran | Lampiran[];
	};
}

export interface Notifikasi extends RecordModel {
	judul?: string;
	pesan?: string;
	dibaca?: boolean;
	warga?: string;
}

export type WalletType = 'KAS' | 'PERSONAL' | string;

export interface Wallet extends RecordModel {
	user?: string;
	wallet_type?: WalletType;
	balance?: number;
	note?: string;
	expand?: {
		user?: { id: string; name?: string; email?: string };
	};
}

export type TxType =
	| 'TOPUP'
	| 'IURAN'
	| 'PENGELUARAN'
	| 'TRANSFER'
	| 'WITHDRAWAL'
	| 'REVERSAL'
	| string;

export type TxStatus = 'SUCCESS' | 'PENDING' | 'FAILED' | string;

export interface Transaction extends RecordModel {
	type?: TxType;
	status?: TxStatus;
	amount?: number;
	fee?: number;
	net_amount?: number;
	reference_no?: string;
	note?: string;
	created_by?: string;
	expand?: {
		created_by?: { id: string; name?: string; email?: string };
	};
}

export type LedgerEntry = 'CREDIT' | 'DEBIT' | string;

export interface Ledger extends RecordModel {
	wallet: string;
	transaction?: string;
	entry_type?: LedgerEntry;
	amount?: number;
	balance_before?: number;
	balance_after?: number;
	expand?: {
		transaction?: Transaction;
	};
}

export interface LaporanScurity extends RecordModel {
	jenis?: string;
	tanggal?: string;
	dibuat_oleh?: string;
	catatan?: string;
}

export interface AbsenScurityInfo {
	nama: string;
	no_hp: string;
}

export interface FileMutasi extends RecordModel {
	nama_file?: string;
	bulan?: string;
	periode_awal?: string;
	periode_akhir?: string;
	saldo_awal?: number;
	saldo_akhir?: number;
	total_kredit?: number;
	total_debet?: number;
	file_pdf?: string;
	uploaded_by?: string;
}

export interface MutasiRow extends RecordModel {
	file_mutasi?: string;
	no_urut?: number;
	tanggal_posting?: string;
	keterangan?: string;
	mutasi_debet?: number;
	mutasi_kredit?: number;
	saldo_akhir?: number;
}

export type LaporStatus =
	| 'Menunggu Konfirmasi'
	| 'Diproses'
	| 'Selesai'
	| 'Ditolak'
	| string;

export interface Lapor extends RecordModel {
	warga?: string;
	keterangan?: string;
	foto?: string;
	status?: LaporStatus;
	respons?: string;
	expand?: {
		warga?: Warga;
	};
}

export interface LaporanScurityRec extends RecordModel {
	jenis?: string;
	keterangan?: string;
	foto?: string;
	dibuat_oleh?: string;
	tanggal?: string;
}
