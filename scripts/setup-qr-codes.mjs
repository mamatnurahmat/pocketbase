#!/usr/bin/env node
/**
 * Provisioning + seed + backfill PNG untuk koleksi `qr_codes` di PocketBase.
 *
 * Alur (idempotent — aman dijalankan berkali-kali):
 *   1. Login admin
 *   2. Pastikan koleksi ada (create bila belum)
 *   3. Pastikan field `image` (file PNG) ada di koleksi
 *   4. Untuk setiap warga: create record kalau belum ada, atau update image
 *      kalau record ada tapi image kosong.
 *
 * Usage:
 *   PB_URL=https://prestige2.sawangan.web.id \
 *   PB_ADMIN_EMAIL=admin@example.com \
 *   PB_ADMIN_PASSWORD=xxx \
 *   [DEV=1] \                # koleksi jadi dev_qr_codes
 *   [LIMIT=5] \              # batasi jumlah warga yang diproses
 *   [FORCE=1] \              # regenerate PNG walau image sudah ada
 *   node scripts/setup-qr-codes.mjs
 */

import PocketBase from 'pocketbase';
import QRCode from 'qrcode';

const PB_URL = process.env.PB_URL || 'https://prestige2.sawangan.web.id';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;
const IS_DEV = process.env.DEV === '1' || process.env.DEV === 'true';
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : 0;
const FORCE = process.env.FORCE === '1' || process.env.FORCE === 'true';

const QR_COLLECTION = IS_DEV ? 'dev_qr_codes' : 'qr_codes';
const WARGA_COLLECTION = 'warga';
const QR_PNG_SIZE = 640;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
	console.error('❌ PB_ADMIN_EMAIL dan PB_ADMIN_PASSWORD wajib di-set.');
	process.exit(1);
}

function log(...a) {
	console.log('[qr-setup]', ...a);
}

function genToken() {
	return crypto.randomUUID().replace(/-/g, '');
}

async function pngBuffer(code) {
	return QRCode.toBuffer(code, {
		width: QR_PNG_SIZE,
		margin: 2,
		errorCorrectionLevel: 'M',
		type: 'png',
		color: { dark: '#0F1A14', light: '#FFFFFF' }
	});
}

async function ensureCollection(pb) {
	let wargaCol;
	try {
		wargaCol = await pb.collections.getOne(WARGA_COLLECTION);
	} catch {
		throw new Error(`Koleksi "${WARGA_COLLECTION}" tidak ditemukan di ${PB_URL}`);
	}

	let col;
	try {
		col = await pb.collections.getOne(QR_COLLECTION);
		log(`✓ Koleksi ${QR_COLLECTION} sudah ada (id=${col.id})`);
	} catch {
		log(`… Koleksi ${QR_COLLECTION} belum ada, membuat baru…`);
		col = await pb.collections.create({
			name: QR_COLLECTION,
			type: 'base',
			fields: [
				{
					name: 'warga',
					type: 'relation',
					required: true,
					collectionId: wargaCol.id,
					cascadeDelete: true,
					maxSelect: 1
				},
				{ name: 'code', type: 'text', required: true, min: 16, max: 64 },
				{ name: 'active', type: 'bool' }
			],
			indexes: [
				`CREATE UNIQUE INDEX idx_${QR_COLLECTION}_warga_active ON ${QR_COLLECTION} (warga) WHERE active = TRUE`,
				`CREATE UNIQUE INDEX idx_${QR_COLLECTION}_code ON ${QR_COLLECTION} (code)`
			],
			listRule: '@request.auth.id != ""',
			viewRule: '@request.auth.id != ""',
			createRule: '@request.auth.id != ""',
			updateRule:
				'@request.auth.id != "" && @collection.warga.id ?= warga && @collection.warga.pengurus = true',
			deleteRule:
				'@request.auth.id != "" && @collection.warga.id ?= warga && @collection.warga.pengurus = true'
		});
		log(`✓ Koleksi ${QR_COLLECTION} dibuat (id=${col.id})`);
	}

	// Pastikan field `image` (file PNG) ada
	const hasImage = (col.fields || []).some((f) => f.name === 'image');
	if (!hasImage) {
		log(`… menambahkan field image ke ${QR_COLLECTION}…`);
		const fields = [
			...col.fields.filter((f) => !f.system),
			{
				name: 'image',
				type: 'file',
				required: false,
				maxSelect: 1,
				maxSize: 1_048_576,
				mimeTypes: ['image/png']
			}
		];
		col = await pb.collections.update(col.id, { fields });
		log(`✓ Field image ditambahkan`);
	} else {
		log(`✓ Field image sudah ada`);
	}

	return col;
}

function buildFormData(fields, code, filename) {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) {
		if (v !== undefined && v !== null) fd.append(k, String(v));
	}
	if (code) {
		// dummy — akan di-overwrite bila filename diberikan
	}
	return fd;
}

async function upsertOne(pb, warga) {
	// Cari record aktif untuk warga ini.
	// Note: filter `active=true` menyebabkan 403 di beberapa versi PB; filter
	// dulu berdasarkan `warga` saja, lalu cek `active` di client.
	let rec = null;
	try {
		const list = await pb
			.collection(QR_COLLECTION)
			.getFullList({ filter: `warga="${warga.id}"` });
		rec = list.find((r) => r.active) || list[0] || null;
	} catch {
		rec = null;
	}

	if (!rec) {
		// Create record baru + image
		const code = genToken();
		const buf = await pngBuffer(code);
		const fd = new FormData();
		fd.append('warga', warga.id);
		fd.append('code', code);
		fd.append('active', 'true');
		fd.append('image', new Blob([buf], { type: 'image/png' }), `qr-${warga.no_rumah || warga.id}.png`);
		await pb.collection(QR_COLLECTION).create(fd);
		return 'created';
	}

	// Record ada — apakah image sudah ada?
	if (!FORCE && rec.image) return 'skipped';

	const buf = await pngBuffer(rec.code);
	const fd = new FormData();
	fd.append('image', new Blob([buf], { type: 'image/png' }), `qr-${warga.no_rumah || warga.id}.png`);
	await pb.collection(QR_COLLECTION).update(rec.id, fd);
	return FORCE && rec.image ? 'regenerated' : 'image-added';
}

async function seed(pb) {
	log('Mengambil daftar warga…');
	const wargaList = await pb.collection(WARGA_COLLECTION).getFullList({
		sort: 'no_rumah'
	});
	log(`  → ${wargaList.length} warga ditemukan`);

	const targets = LIMIT > 0 ? wargaList.slice(0, LIMIT) : wargaList;
	log(`  → akan diproses: ${targets.length} warga (FORCE=${FORCE ? 'yes' : 'no'})`);

	const stats = { created: 0, 'image-added': 0, regenerated: 0, skipped: 0, error: 0 };
	for (const w of targets) {
		try {
			const r = await upsertOne(pb, w);
			stats[r] = (stats[r] || 0) + 1;
			const mark = r === 'skipped' ? '·' : '+';
			process.stdout.write(`  ${mark} ${w.no_rumah || w.id} — ${r}\n`);
		} catch (e) {
			stats.error++;
			console.warn(`  ! ${w.no_rumah || w.id}: ${e.message || e}`);
			if (e.data) console.warn('     ' + JSON.stringify(e.data));
		}
	}

	log(`✓ Selesai. ${JSON.stringify(stats)}`);
}

async function main() {
	const pb = new PocketBase(PB_URL);
	pb.autoCancellation(false);

	log(`Login admin ke ${PB_URL}…`);
	try {
		await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
	} catch (e) {
		console.error('❌ Login admin gagal:', e.message || e);
		process.exit(1);
	}
	log(`✓ Auth OK sebagai ${ADMIN_EMAIL}`);

	await ensureCollection(pb);
	await seed(pb);
}

main().catch((e) => {
	console.error('❌ Fatal:', e);
	process.exit(1);
});
