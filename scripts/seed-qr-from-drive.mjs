#!/usr/bin/env node
/**
 * Seed QR real dari Google Drive folder public ke PocketBase.
 *
 * Sumber:
 *   File Drive dinamai per `no_rumah` (mis. A01.png, C09.png).
 *   Peta filename → fileId disediakan via file JSON (di-generate dari
 *   scraping folder Drive), ATAU via env DRIVE_MAP_FILE.
 *
 * Untuk setiap entry:
 *   1. Download PNG dari Google Drive (public link uc?export=download)
 *   2. Cari warga di PB dengan no_rumah=<basename>
 *   3. Update record qr_codes untuk warga tsb → upload image (nama file di
 *      server: `<no_rumah>.png`)
 *
 * Usage:
 *   PB_URL=https://prestige2.sawangan.web.id \
 *   PB_ADMIN_EMAIL=admin@example.com \
 *   PB_ADMIN_PASSWORD=xxx \
 *   DRIVE_MAP_FILE=/tmp/qr-map.json \
 *   [DEV=1] \
 *   node scripts/seed-qr-from-drive.mjs
 */

import PocketBase from 'pocketbase';
import fs from 'node:fs/promises';

const PB_URL = process.env.PB_URL || 'https://prestige2.sawangan.web.id';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;
const IS_DEV = process.env.DEV === '1' || process.env.DEV === 'true';
const MAP_FILE = process.env.DRIVE_MAP_FILE || '/tmp/qr-map.json';

const QR_COLLECTION = IS_DEV ? 'dev_qr_codes' : 'qr_codes';
const WARGA_COLLECTION = 'warga';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
	console.error('❌ PB_ADMIN_EMAIL dan PB_ADMIN_PASSWORD wajib di-set.');
	process.exit(1);
}

function log(...a) {
	console.log('[drive-seed]', ...a);
}

async function downloadFromDrive(fileId) {
	const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
	const res = await fetch(url, {
		redirect: 'follow',
		headers: { 'User-Agent': 'Mozilla/5.0' }
	});
	if (!res.ok) throw new Error(`HTTP ${res.status} download ${fileId}`);
	const buf = Buffer.from(await res.arrayBuffer());
	// Cek PNG magic (89 50 4E 47)
	if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
		throw new Error(`bukan PNG (magic bytes salah) — id=${fileId}`);
	}
	return buf;
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

async function seed(pb, map) {
	const stats = { updated: 0, created: 0, 'warga-missing': 0, error: 0 };
	const entries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));

	for (const [filename, fileId] of entries) {
		const noRumah = filename.replace(/\.png$/i, '');
		try {
			const warga = await findWargaByRumah(pb, noRumah);
			if (!warga) {
				console.warn(`  ! ${noRumah} — warga tidak ada di PB`);
				stats['warga-missing']++;
				continue;
			}

			const buf = await downloadFromDrive(fileId);
			const rec = await findQrForWarga(pb, warga.id);

			const fd = new FormData();
			fd.append('image', new Blob([buf], { type: 'image/png' }), `${noRumah}.png`);

			if (rec) {
				await pb.collection(QR_COLLECTION).update(rec.id, fd);
				process.stdout.write(`  ✓ ${noRumah} — image updated (${buf.length} bytes)\n`);
				stats.updated++;
			} else {
				// Tidak ada record — buat lengkap
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
	const raw = await fs.readFile(MAP_FILE, 'utf8');
	const map = JSON.parse(raw);
	log(`Loaded ${Object.keys(map).length} entries dari ${MAP_FILE}`);

	const pb = new PocketBase(PB_URL);
	pb.autoCancellation(false);
	await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
	log(`Auth OK. Target koleksi: ${QR_COLLECTION}`);

	const stats = await seed(pb, map);
	log(`✓ Selesai. ${JSON.stringify(stats)}`);
}

main().catch((e) => {
	console.error('❌ Fatal:', e);
	process.exit(1);
});
