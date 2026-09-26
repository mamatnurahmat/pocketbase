import QRCode from 'qrcode';
import { pb } from './pb';
import type { QrCode } from './types';

const COLLECTION = 'qr_codes';
const QR_SIZE = 640;

function genToken(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID().replace(/-/g, '');
	}
	return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function findByWarga(wargaId: string): Promise<QrCode | null> {
	try {
		const list = await pb
			.collection(COLLECTION)
			.getFullList<QrCode>({ filter: `warga="${wargaId}"` });
		return list.find((r) => r.active) || list[0] || null;
	} catch {
		return null;
	}
}

async function pngBlob(code: string): Promise<Blob> {
	const dataUrl = await QRCode.toDataURL(code, {
		errorCorrectionLevel: 'M',
		margin: 2,
		width: QR_SIZE,
		color: { dark: '#0F1A14', light: '#FFFFFF' }
	});
	const res = await fetch(dataUrl);
	return res.blob();
}

/**
 * Ambil (atau buat) record QR untuk warga.
 * - Belum ada record → buat baru + upload PNG.
 * - Record ada tapi `image` kosong → generate & upload PNG (rare — seharusnya
 *   sudah di-backfill di server, tapi tetap didefinisikan sebagai safety net).
 */
export async function getOrCreateQrForWarga(wargaId: string): Promise<QrCode> {
	const existing = await findByWarga(wargaId);
	if (existing?.image) return existing;

	if (existing && !existing.image) {
		try {
			const blob = await pngBlob(existing.code);
			const fd = new FormData();
			fd.append('image', blob, `qr-${wargaId}.png`);
			return await pb.collection(COLLECTION).update<QrCode>(existing.id, fd);
		} catch (e) {
			console.warn('qr image update failed:', e);
			return existing;
		}
	}

	// Belum ada record — buat baru
	const code = genToken();
	try {
		const blob = await pngBlob(code);
		const fd = new FormData();
		fd.append('warga', wargaId);
		fd.append('code', code);
		fd.append('active', 'true');
		fd.append('image', blob, `qr-${wargaId}.png`);
		return await pb.collection(COLLECTION).create<QrCode>(fd);
	} catch (e) {
		const again = await findByWarga(wargaId);
		if (again) return again;
		throw e;
	}
}

/** URL publik file image di PB (kosong string bila record belum punya image). */
export function getQrImageUrl(rec: QrCode | null | undefined): string {
	if (!rec || !rec.image) return '';
	return pb.files.getURL(rec, rec.image);
}

/**
 * Download PNG QR ke device.
 * Fetch file dari PB lalu trigger anchor download (agar filename bisa custom
 * & lintas-domain tetap jalan).
 */
export async function downloadQrImage(rec: QrCode, filename: string): Promise<void> {
	const url = getQrImageUrl(rec);
	if (!url) throw new Error('QR image belum tersedia');
	const res = await fetch(url);
	const blob = await res.blob();
	const objectUrl = URL.createObjectURL(blob);
	try {
		const a = document.createElement('a');
		a.href = objectUrl;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}
