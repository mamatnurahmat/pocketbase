#!/usr/bin/env node
/**
 * Seed QR real dari folder lokal ke PocketBase.
 *
 * File di folder dinamai per `no_rumah` (mis. A01.png, C09.png).
 * Untuk setiap file: cari warga dengan no_rumah=<basename>, lalu update record
 * qr_codes (image field) — nama tersimpan di server diawali `<no_rumah>_`.
 *
 * Usage:
 *   PB_URL=https://prestige2.sawangan.web.id \
 *   PB_ADMIN_EMAIL=admin@example.com \
 *   PB_ADMIN_PASSWORD=xxx \
 *   QR_DIR=~/Downloads/QRIS \
 *   [DEV=1] \
 *   node scripts/seed-qr-from-local.mjs
 */

import PocketBase from 'pocketbase';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const PB_URL = process.env.PB_URL || 'https://prestige2.sawangan.web.id';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;
const IS_DEV = process.env.DEV === '1' || process.env.DEV === 'true';
const QR_DIR = (process.env.QR_DIR || '').replace(/^~/, os.homedir());

const QR_COLLECTION = IS_DEV ? 'dev_qr_codes' : 'qr_codes';
const WARGA_COLLECTION = 'warga';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !QR_DIR) {
	console.error('❌ Env wajib: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD, QR_DIR');
	process.exit(1);
}

function log(...a) {
	console.log('[local-seed]', ...a);
}

async function findWargaByRumah(pb, noRumah) {
	try {
		return await pb
			.collection(WARGA_COLLECTION)
			.getFirstListItem(`no_rumah="${noRumah}"`);
	} catch {
		return null;
	}
}

async function findQrForWarga(pb, wargaId) {
	try {
		const list = await pb
			.collection(QR_COLLECTION)
			.getFullList({ filter: `warga="${wargaId}"` });
		return list.find((r) => r.active) || list[0] || null;
	} catch {
		return null;
	}
}

async function seed(pb) {
	const files = (await fs.readdir(QR_DIR))
		.filter((f) => /\.png$/i.test(f))
		.sort();
	log(`Ditemukan ${files.length} file .png di ${QR_DIR}`);

	const stats = { updated: 0, created: 0, 'warga-missing': 0, error: 0 };
	for (const fname of files) {
		const noRumah = fname.replace(/\.png$/i, '');
		try {
			const warga = await findWargaByRumah(pb, noRumah);
			if (!warga) {
				console.warn(`  ! ${noRumah} — warga tidak ada di PB`);
				stats['warga-missing']++;
				continue;
			}

			const buf = await fs.readFile(path.join(QR_DIR, fname));
			if (buf[0] !== 0x89 || buf[1] !== 0x50) {
				throw new Error('bukan PNG (magic bytes salah)');
			}
			const rec = await findQrForWarga(pb, warga.id);

			const fd = new FormData();
			fd.append(
				'image',
				new Blob([buf], { type: 'image/png' }),
				`${noRumah}.png`
			);

			if (rec) {
				await pb.collection(QR_COLLECTION).update(rec.id, fd);
				process.stdout.write(
					`  ✓ ${noRumah} — image updated (${buf.length} bytes)\n`
				);
				stats.updated++;
			} else {
				const code = crypto.randomUUID().replace(/-/g, '');
				fd.append('warga', warga.id);
				fd.append('code', code);
				fd.append('active', 'true');
				await pb.collection(QR_COLLECTION).create(fd);
				process.stdout.write(`  + ${noRumah} — record baru + image\n`);
				stats.created++;
			}
		} catch (e) {
			console.warn(`  ! ${noRumah}: ${e.message || e}`);
			if (e.data) console.warn('     ' + JSON.stringify(e.data));
			stats.error++;
		}
	}
	return stats;
}

async function main() {
	const pb = new PocketBase(PB_URL);
	pb.autoCancellation(false);
	await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
	log(`Auth OK. Target koleksi: ${QR_COLLECTION}`);

	const stats = await seed(pb);
	log(`✓ Selesai. ${JSON.stringify(stats)}`);
}

main().catch((e) => {
	console.error('❌ Fatal:', e);
	process.exit(1);
});
