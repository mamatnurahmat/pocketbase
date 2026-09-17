<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { pb } from '$lib/pb';
	import { isPengurus } from '$lib/auth';
	import { modePengurus } from '$lib/mode';
	import { fmtRupiah, toast } from '$lib/ui';
	import type { Tagihan, Lampiran } from '$lib/types';
	import {
		listTagihan,
		listIuranKodes,
		getWargaByUser,
		approveTagihan,
		uploadLampiran,
		asLampiranList,
		isImageName,
		isPdfName,
		fileUrl
	} from '$lib/tagihan';
	import AppBar from '$lib/components/AppBar.svelte';
	import States from '$lib/components/States.svelte';
	import Modal from '$lib/components/Modal.svelte';

	type StatusFilter = 'all' | 'Belum Dibayar' | 'Menunggu Konfirmasi' | 'Lunas';

	const FILTERS: { key: StatusFilter; label: string }[] = [
		{ key: 'all', label: 'Semua' },
		{ key: 'Belum Dibayar', label: 'Belum Bayar' },
		{ key: 'Menunggu Konfirmasi', label: 'Menunggu' },
		{ key: 'Lunas', label: 'Lunas' }
	];

	// ── State ──
	let tagihan = $state<Tagihan[]>([]);
	let kodes = $state<string[]>([]);
	let filter = $state<StatusFilter>('all');
	let selectedKode = $state<string>('all');
	let searchRumah = $state('');
	let loading = $state(true);
	let error = $state('');

	// Mode pengurus — pakai store bersama supaya sinkron dengan Profil & Dashboard.
	// Ubah nilai via `modePengurus.set(next)` — auto-persist ke localStorage.

	// ── Fetch ──
	async function loadAll() {
		if (!pb.authStore.isValid) return;
		loading = true;
		error = '';
		try {
			const userId = pb.authStore.record?.id;
			if (!userId) throw new Error('Sesi tidak valid.');
			const w = await getWargaByUser(userId);
			// Sinkronkan flag pengurus (kalau berubah di DB)
			if (browser) {
				localStorage.setItem('isPengurus', w.pengurus ? 'true' : 'false');
			}
			isPengurus.set(!!w.pengurus);
			modePengurus.refresh();

			tagihan = await listTagihan(w.id, !!w.pengurus && $modePengurus);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Gagal memuat tagihan.';
		} finally {
			loading = false;
		}
	}

	async function loadKodes() {
		try {
			kodes = await listIuranKodes();
		} catch {
			/* biarkan kosong */
		}
	}

	onMount(() => {
		void loadKodes();
		void loadAll();
	});

	// Reload kalau modePengurus berubah (mirip useEffect di React lama)
	$effect(() => {
		void $modePengurus;
		if (pb.authStore.isValid) void loadAll();
	});

	// ── Derived ──
	const filtered = $derived(
		tagihan.filter((t) => {
			if (filter !== 'all' && t.status_pembayaran !== filter) return false;
			if (selectedKode !== 'all') {
				const k = t.expand?.iuran?.kode ?? '-';
				if (k !== selectedKode) return false;
			}
			if ($isPengurus && searchRumah.trim()) {
				const q = searchRumah.trim().toLowerCase();
				const rumah = (t.expand?.warga?.no_rumah || '').toLowerCase();
				const nama = (t.expand?.warga?.expand?.user?.name || '').toLowerCase();
				if (!rumah.includes(q) && !nama.includes(q)) return false;
			}
			return true;
		})
	);

	const totalUnpaid = $derived(
		tagihan
			.filter((t) => t.status_pembayaran !== 'Lunas')
			.reduce((s, t) => s + (t.nominal || 0), 0)
	);

	const activeCount = $derived(
		tagihan.filter((t) => t.status_pembayaran !== 'Lunas').length
	);

	const hasFilterActive = $derived(
		selectedKode !== 'all' || ($isPengurus && !!searchRumah)
	);

	function resetFilters() {
		selectedKode = 'all';
		searchRumah = '';
		filter = 'all';
	}

	function statusChip(status: string | undefined): string {
		if (status === 'Lunas') return 'ok';
		if (status === 'Menunggu Konfirmasi') return 'warn';
		return 'err';
	}

	function fmtJatuhTempo(v?: string): string {
		if (!v) return '';
		const d = new Date(v);
		return d.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	// ── Modal state ──
	let confirmApproveId = $state<string | null>(null);
	let approving = $state(false);

	async function doApprove() {
		if (!confirmApproveId) return;
		approving = true;
		try {
			await approveTagihan(confirmApproveId);
			tagihan = tagihan.map((t) =>
				t.id === confirmApproveId ? { ...t, status_pembayaran: 'Lunas' } : t
			);
			toast('Tagihan disetujui', 'ok');
			confirmApproveId = null;
		} catch (e) {
			toast(e instanceof Error ? e.message : 'Gagal menyetujui.', 'err');
		} finally {
			approving = false;
		}
	}

	let lampiranTarget = $state<Tagihan | null>(null);
	let uploadFile = $state<File | null>(null);
	let uploading = $state(false);

	function onFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		uploadFile = input.files?.[0] ?? null;
	}

	async function doUpload() {
		if (!lampiranTarget || !uploadFile) return;
		uploading = true;
		try {
			await uploadLampiran(lampiranTarget.id, uploadFile);
			toast('Lampiran terupload', 'ok');
			uploadFile = null;
			lampiranTarget = null;
			await loadAll();
		} catch (e) {
			toast(e instanceof Error ? e.message : 'Gagal upload.', 'err');
		} finally {
			uploading = false;
		}
	}

	interface Preview {
		url: string;
		name: string;
		kind: 'image' | 'pdf' | 'other';
	}

	let preview = $state<Preview | null>(null);

	function openPreview(lmp: Lampiran) {
		const name = lmp.file_bukti || '';
		let kind: Preview['kind'] = 'other';
		if (isImageName(name)) kind = 'image';
		else if (isPdfName(name)) kind = 'pdf';
		preview = { url: fileUrl(lmp), name, kind };
	}

	// ── Export CSV ──
	function exportCsv() {
		const rows: (string | number)[][] = [];
		const header = [
			'No',
			...($modePengurus ? ['Warga', 'No. Rumah'] : []),
			'Bulan Iuran',
			'Nominal',
			'Status',
			'Jatuh Tempo',
			'Tgl Dibuat'
		];
		rows.push(header);
		filtered.forEach((t, i) => {
			rows.push([
				i + 1,
				...($modePengurus
					? [
							t.expand?.warga?.expand?.user?.name || 'Warga',
							t.expand?.warga?.no_rumah || ''
					  ]
					: []),
				t.expand?.iuran?.kode || '-',
				String(t.nominal ?? 0),
				t.status_pembayaran || '-',
				fmtJatuhTempo(t.jatuh_tempo) || '-',
				t.created ? new Date(t.created).toLocaleDateString('id-ID') : '-'
			]);
		});
		const csv = rows.map((r) => r.join(',')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'tagihan.csv';
		a.click();
		URL.revokeObjectURL(url);
	}

	// ── Export PDF (lazy load jsPDF via CDN, sama seperti React) ──
	function loadScript(src: string): Promise<void> {
		return new Promise((resolve, reject) => {
			if (document.querySelector(`script[src="${src}"]`)) return resolve();
			const s = document.createElement('script');
			s.src = src;
			s.async = false;
			s.onload = () => resolve();
			s.onerror = () => reject(new Error(`Gagal load ${src}`));
			document.head.appendChild(s);
		});
	}

	async function exportPdf() {
		const w = window as unknown as {
			jspdf?: { jsPDF: new (opts?: unknown) => unknown };
		};
		if (!w.jspdf) {
			try {
				await loadScript(
					'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
				);
				await loadScript(
					'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
				);
			} catch {
				toast('Gagal memuat library PDF (cek koneksi).', 'err');
				return;
			}
		}
		const { jsPDF } = (window as unknown as { jspdf: { jsPDF: new (opts?: unknown) => any } }).jspdf;
		const doc: any = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
		const margin = 14;
		const pageW = 210;
		const contentW = pageW - margin * 2;

		doc.setFillColor(15, 26, 20);
		doc.rect(0, 0, pageW, 28, 'F');
		doc.setTextColor(255, 255, 255);
		doc.setFontSize(14);
		doc.setFont('helvetica', 'bold');
		doc.text('WARGA P2S — RW 04', margin, 18);

		const title = 'Laporan Tagihan' + ($modePengurus ? ' (Semua Warga)' : '');
		doc.setTextColor(15, 26, 20);
		doc.setFontSize(18);
		doc.setFont('helvetica', 'bold');
		doc.text(title, margin, 44);

		const now = new Date();
		const dateStr = now.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
		let subtitle = 'Dicetak: ' + dateStr;
		if (filter !== 'all') subtitle += ' | Status: ' + filter;
		if (selectedKode !== 'all') subtitle += ' | Bulan: ' + selectedKode;
		doc.setFontSize(9);
		doc.setTextColor(110, 123, 114);
		doc.setFont('helvetica', 'normal');
		doc.text(subtitle, margin, 52);

		const cols = $modePengurus
			? ['No', 'Warga', 'No. Rumah', 'Bulan Iuran', 'Nominal', 'Status', 'Jatuh Tempo']
			: ['No', 'Bulan Iuran', 'Nominal', 'Status', 'Jatuh Tempo'];
		const rows = filtered.map((t, i) => {
			const base: (string | number)[] = [
				String(i + 1),
				t.expand?.iuran?.kode || '-',
				fmtRupiah(t.nominal || 0),
				t.status_pembayaran || '-',
				fmtJatuhTempo(t.jatuh_tempo) || '-'
			];
			if ($modePengurus) {
				base.splice(
					1,
					0,
					t.expand?.warga?.expand?.user?.name || 'Warga',
					t.expand?.warga?.no_rumah || ''
				);
			}
			return base;
		});

		doc.autoTable({
			startY: 60,
			head: [cols],
			body: rows,
			theme: 'grid',
			headStyles: {
				fillColor: [21, 147, 90],
				textColor: [255, 255, 255],
				fontStyle: 'bold',
				fontSize: 10,
				halign: 'center',
				cellPadding: { top: 5, bottom: 5, left: 6, right: 6 }
			},
			bodyStyles: {
				fontSize: 9,
				textColor: [15, 26, 20],
				cellPadding: { top: 4, bottom: 4, left: 6, right: 6 }
			},
			alternateRowStyles: { fillColor: [244, 246, 244] },
			margin: { left: margin, right: margin },
			tableWidth: contentW,
			styles: {
				cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
				lineColor: [200, 204, 198],
				lineWidth: 0.3
			},
			didDrawPage: (data: { pageNumber: number; pageCount: number }) => {
				doc.setFontSize(8);
				doc.setTextColor(160, 160, 160);
				doc.setFont('helvetica', 'normal');
				doc.text(
					`Warga P2S — RW 04 | Halaman ${data.pageNumber} dari ${data.pageCount}`,
					margin,
					290
				);
			}
		});

		const finalY = doc.lastAutoTable?.finalY || 200;
		const totalFiltered = filtered.reduce(
			(s, t) => s + (t.nominal || 0),
			0
		);
		doc.setDrawColor(15, 26, 20);
		doc.setLineWidth(0.5);
		doc.line(margin, finalY + 8, pageW - margin, finalY + 8);
		doc.setFontSize(11);
		doc.setFont('helvetica', 'bold');
		doc.setTextColor(15, 26, 20);
		doc.text(
			`Total: ${fmtRupiah(totalFiltered)} | ${filtered.length} tagihan`,
			margin,
			finalY + 18
		);

		doc.save('tagihan-' + now.toISOString().slice(0, 10) + '.pdf');
	}
</script>

<AppBar
	title="Tagihan"
	subtitle={loading ? 'Memuat…' : `${activeCount} tagihan aktif`}
	back="/dashboard"
/>

<div class="page">
	<!-- Summary -->
	<div class="summary">
		<span class="label">
			Total {$modePengurus ? 'semua warga ' : ''}belum dibayar
		</span>
		<span class="amount">{fmtRupiah(totalUnpaid)}</span>
		<span class="hint">{activeCount} tagihan aktif</span>
		{#if $isPengurus}
			<label class="mode">
				<input
					type="checkbox"
					checked={$modePengurus}
					onchange={(e) => modePengurus.set((e.currentTarget as HTMLInputElement).checked)}
				/>
				<span>Lihat semua warga</span>
			</label>
		{/if}
	</div>

	<!-- Filter status -->
	<div class="pills">
		{#each FILTERS as f (f.key)}
			<button
				class="pill"
				class:on={filter === f.key}
				onclick={() => (filter = f.key)}
			>
				{f.label}
			</button>
		{/each}
	</div>

	<!-- Filter kode / rumah -->
	<div class="filter-row">
		{#if $isPengurus}
			<div class="search">
				<input
					type="text"
					placeholder="Cari nama / no. rumah…"
					bind:value={searchRumah}
				/>
				{#if searchRumah}
					<button
						class="clear"
						onclick={() => (searchRumah = '')}
						aria-label="Kosongkan pencarian"
					>
						✕
					</button>
				{/if}
			</div>
		{/if}

		<select class="select" bind:value={selectedKode}>
			<option value="all">Semua Bulan</option>
			{#each kodes as k (k)}
				<option value={k}>{k}</option>
			{/each}
		</select>

		{#if hasFilterActive || filter !== 'all'}
			<button class="reset" onclick={resetFilters}>Reset</button>
		{/if}
	</div>

	<!-- Header list -->
	<div class="list-head">
		<span class="section-title" style="margin: 0">Daftar tagihan</span>
		<div class="head-actions">
			{#if filtered.length > 0}
				<button class="dark" onclick={exportPdf}>PDF</button>
				<button class="soft" onclick={exportCsv}>CSV</button>
				<span class="count">{filtered.length} item</span>
			{/if}
		</div>
	</div>

	<!-- List body -->
	{#if loading}
		<States kind="loading" rows={5} />
	{:else if error}
		<States kind="error" text={error} onRetry={loadAll} />
	{:else if filtered.length === 0}
		<States
			kind="empty"
			title="Tidak ada tagihan"
			text="Coba ubah filter atau status."
		/>
	{:else}
		<div class="list">
			{#each filtered as t (t.id)}
				{@const lampirans = asLampiranList(t.expand?.lampiran)}
				<div class="item card">
					<div class="ico">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
							<rect x="4" y="3" width="16" height="18" rx="3" stroke="#15935A" stroke-width="1.8" />
							<path d="M8 8h8M8 12h8M8 16h5" stroke="#15935A" stroke-width="1.8" stroke-linecap="round" />
						</svg>
					</div>
					<div class="mid">
						<span class="title">
							{$modePengurus && t.expand?.warga
								? t.expand.warga.expand?.user?.name || 'Warga'
								: t.expand?.iuran?.kode || '-'}
						</span>
						<span class="sub">
							{#if $modePengurus && t.expand?.warga}
								No. {t.expand.warga.no_rumah} · {t.expand?.iuran?.kode || '-'}
							{:else}
								{t.expand?.iuran?.kode || '-'}
								{#if t.jatuh_tempo}
									· Jatuh tempo: {fmtJatuhTempo(t.jatuh_tempo)}
								{/if}
							{/if}
						</span>
					</div>
					<div class="right">
						<span class="amt">{fmtRupiah(t.nominal)}</span>
						<span class="chip {statusChip(t.status_pembayaran)}">
							{t.status_pembayaran}
						</span>
						{#if t.status_pembayaran !== 'Lunas'}
							<div class="actions">
								{#if $modePengurus}
									<button
										class="btn-approve"
										onclick={() => (confirmApproveId = t.id)}
									>
										Setujui
									</button>
								{/if}
								{#if lampirans.length === 0}
									<button
										class="btn-attach"
										onclick={() => {
											lampiranTarget = t;
											uploadFile = null;
										}}
									>
										+ Lampiran
									</button>
								{/if}
							</div>
						{/if}
						{#if lampirans.length > 0}
							<div class="attachments">
								{#each lampirans as lmp, idx (lmp.id || idx)}
									{#if lmp.file_bukti}
										<button
											class="attach-link"
											onclick={() => openPreview(lmp)}
										>
											{#if isImageName(lmp.file_bukti)}
												📷 Lihat Bukti
											{:else if isPdfName(lmp.file_bukti)}
												📄 Buka PDF
											{:else}
												🔗 Buka File
											{/if}
											{lampirans.length > 1 ? ` ${idx + 1}` : ''}
										</button>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- ── Modal Approve ── -->
<Modal
	open={confirmApproveId !== null}
	title="Konfirmasi"
	maxWidth={340}
	onClose={() => (confirmApproveId = null)}
>
	<p class="modal-text">Tandai tagihan ini menjadi <b>Lunas</b>?</p>
	<div class="modal-actions">
		<button
			class="btn btn-outline"
			onclick={() => (confirmApproveId = null)}
			disabled={approving}
		>
			Batal
		</button>
		<button class="btn btn-primary" onclick={doApprove} disabled={approving}>
			{approving ? 'Memproses…' : 'Ya, Setujui'}
		</button>
	</div>
</Modal>

<!-- ── Modal Upload Lampiran ── -->
<Modal
	open={lampiranTarget !== null}
	title="Tambah Lampiran"
	onClose={() => {
		lampiranTarget = null;
		uploadFile = null;
	}}
>
	{#if lampiranTarget}
		{@const w = lampiranTarget.expand?.warga}
		{@const iu = lampiranTarget.expand?.iuran}
		{#if w}
			<div class="warga-badge">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
					<circle cx="12" cy="8" r="3.5" stroke="#15935A" stroke-width="2" />
					<path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" stroke="#15935A" stroke-width="2" stroke-linecap="round" />
				</svg>
				<span>
					{w.expand?.user?.name || 'Warga'} — No. {w.no_rumah}
				</span>
			</div>
		{/if}

		<label class="f-label" for="iuran-info">Iuran yang Dibayar</label>
		<div id="iuran-info" class="iuran-info">
			<span class="k">{iu?.kode || '-'}</span>
			<span class="v">{fmtRupiah(lampiranTarget.nominal)}</span>
			{#if iu?.keterangan}
				<span class="ket">— {iu.keterangan}</span>
			{/if}
		</div>
		<p class="f-hint">Iuran dikunci sesuai tagihan ini (1-to-1)</p>

		<label class="f-label" style="margin-top: 14px;" for="file-input">File Bukti (Gambar / PDF)</label>
		<input
			id="file-input"
			type="file"
			accept="image/jpeg, image/png, image/webp, application/pdf"
			onchange={onFileChange}
			class="file"
		/>

		<div class="modal-actions" style="margin-top: 20px;">
			<button
				class="btn btn-outline"
				onclick={() => {
					lampiranTarget = null;
					uploadFile = null;
				}}
				disabled={uploading}
			>
				Batal
			</button>
			<button
				class="btn btn-primary"
				onclick={doUpload}
				disabled={uploading || !uploadFile}
			>
				{uploading ? 'Mengupload…' : 'Upload'}
			</button>
		</div>
	{/if}
</Modal>

<!-- ── Modal Preview File ── -->
{#if preview}
	<div
		class="preview-backdrop"
		role="dialog"
		aria-modal="true"
		aria-label="Preview file"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) preview = null;
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') preview = null;
		}}
	>
		<button
			class="preview-close"
			onclick={() => (preview = null)}
			aria-label="Tutup preview"
		>
			✕
		</button>
		{#if preview.kind === 'image'}
			<img src={preview.url} alt={preview.name} />
		{:else}
			<iframe src={preview.url} title={preview.name}></iframe>
		{/if}
	</div>
{/if}

<style>
	.summary {
		background: var(--c-primary-gradient);
		color: #fff;
		border-radius: var(--radius-card);
		padding: 18px 20px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		box-shadow: var(--shadow-btn);
	}

	.summary .label {
		font-size: 12.5px;
		font-weight: 600;
		opacity: 0.85;
	}

	.summary .amount {
		font-size: 28px;
		font-weight: 800;
		font-family: var(--mono);
		letter-spacing: -0.02em;
	}

	.summary .hint {
		font-size: 11.5px;
		font-weight: 600;
		opacity: 0.75;
	}

	.mode {
		margin-top: 10px;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: rgba(255, 255, 255, 0.16);
		padding: 6px 12px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		width: fit-content;
	}

	.mode input {
		accent-color: #fff;
	}

	.pills {
		margin-top: 18px;
		display: flex;
		gap: 8px;
		overflow-x: auto;
		padding-bottom: 4px;
		scrollbar-width: none;
	}

	.pills::-webkit-scrollbar {
		display: none;
	}

	.pill {
		flex: none;
		background: var(--c-surface);
		border: 1.5px solid var(--c-border);
		color: var(--c-text-muted);
		padding: 9px 14px;
		border-radius: 20px;
		font-size: 13px;
		font-weight: 600;
		white-space: nowrap;
	}

	.pill.on {
		background: var(--c-primary-soft);
		border-color: var(--c-primary);
		color: var(--c-primary-dark);
		font-weight: 700;
	}

	.filter-row {
		display: flex;
		gap: 10px;
		margin-top: 12px;
		flex-wrap: wrap;
	}

	.search {
		position: relative;
		flex: 1;
		min-width: 140px;
	}

	.search input {
		width: 100%;
		padding: 10px 30px 10px 14px;
		border-radius: 14px;
		border: 1.5px solid var(--c-border);
		background: var(--c-surface);
		font-size: 13px;
		font-weight: 600;
		font-family: inherit;
		outline: none;
	}

	.search input:focus {
		border-color: var(--c-primary);
	}

	.search .clear {
		position: absolute;
		right: 8px;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: var(--c-text-light);
		font-size: 15px;
	}

	.select {
		flex: 1;
		min-width: 140px;
		padding: 10px 34px 10px 14px;
		border-radius: 14px;
		border: 1.5px solid var(--c-border);
		background: var(--c-surface);
		color: var(--c-text-muted);
		font-size: 13px;
		font-weight: 600;
		font-family: inherit;
		appearance: none;
		-webkit-appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7B72' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 10px center;
	}

	.reset {
		padding: 10px 14px;
		border-radius: 14px;
		border: 1.5px solid var(--c-border);
		background: var(--c-surface);
		color: var(--c-text-muted);
		font-size: 13px;
		font-weight: 600;
		font-family: inherit;
	}

	.list-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 20px;
		margin-bottom: 10px;
	}

	.head-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.dark {
		background: var(--c-dark);
		color: #fff;
		border: none;
		padding: 6px 12px;
		border-radius: 10px;
		font-size: 12px;
		font-weight: 700;
		font-family: inherit;
	}

	.soft {
		background: var(--c-primary-soft);
		color: var(--c-primary-dark);
		border: 1.5px solid var(--c-primary);
		padding: 6px 12px;
		border-radius: 10px;
		font-size: 12px;
		font-weight: 700;
		font-family: inherit;
	}

	.count {
		font-size: 11px;
		font-weight: 700;
		color: var(--c-text-light);
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 9px;
	}

	.item {
		display: flex;
		gap: 12px;
		padding: 12px 14px;
	}

	.ico {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		background: var(--c-primary-soft);
		display: flex;
		align-items: center;
		justify-content: center;
		flex: none;
	}

	.mid {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.mid .title {
		font-size: 14px;
		font-weight: 800;
		color: var(--c-text);
		letter-spacing: -0.01em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.mid .sub {
		font-size: 11.5px;
		font-weight: 600;
		color: var(--c-text-muted);
	}

	.right {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 5px;
	}

	.amt {
		font-size: 14px;
		font-weight: 800;
		color: var(--c-text);
		font-variant-numeric: tabular-nums;
	}

	.actions {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.btn-approve {
		background: var(--c-primary);
		color: #fff;
		border: none;
		padding: 4px 10px;
		border-radius: 8px;
		font-size: 11px;
		font-weight: 700;
		font-family: inherit;
	}

	.btn-attach {
		background: var(--c-surface);
		color: var(--c-primary);
		border: 1.5px dashed var(--c-primary);
		padding: 4px 10px;
		border-radius: 8px;
		font-size: 11px;
		font-weight: 600;
		font-family: inherit;
	}

	.attachments {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		justify-content: flex-end;
	}

	.attach-link {
		background: none;
		border: none;
		font-size: 11px;
		color: var(--c-primary);
		font-weight: 600;
		text-decoration: underline;
		padding: 0;
		margin-top: 4px;
		font-family: inherit;
	}

	/* ── Modal helpers ── */
	.modal-text {
		font-size: 14px;
		color: var(--c-text-muted);
		line-height: 1.5;
		text-align: center;
		margin-bottom: 18px;
	}

	.modal-actions {
		display: flex;
		gap: 10px;
	}

	.modal-actions .btn {
		flex: 1;
		height: 44px;
		font-size: 14px;
	}

	.warga-badge {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: var(--c-primary-soft);
		border-radius: 10px;
		margin-bottom: 16px;
		font-size: 13px;
		font-weight: 700;
		color: var(--c-primary-dark);
	}

	.iuran-info {
		padding: 10px 12px;
		background: var(--c-bg);
		border: 1.5px solid var(--c-border);
		border-radius: 10px;
		font-size: 13px;
		display: flex;
		gap: 8px;
		align-items: baseline;
	}

	.iuran-info .k {
		font-weight: 800;
		color: var(--c-primary);
	}

	.iuran-info .v {
		font-weight: 700;
		color: var(--c-text);
	}

	.iuran-info .ket {
		font-size: 11px;
		color: var(--c-text-light);
	}

	.file {
		width: 100%;
		padding: 8px 10px;
		border-radius: 10px;
		border: 1.5px solid var(--c-border);
		background: var(--c-surface);
		font-size: 12px;
		font-family: inherit;
	}

	/* ── Preview overlay ── */
	.preview-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: rgba(0, 0, 0, 0.93);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 12px;
	}

	.preview-close {
		position: absolute;
		top: 16px;
		right: 16px;
		background: rgba(255, 255, 255, 0.18);
		border: none;
		border-radius: 50%;
		width: 44px;
		height: 44px;
		color: #fff;
		font-size: 22px;
	}

	.preview-backdrop img {
		max-width: 100%;
		max-height: 90vh;
		border-radius: 12px;
		object-fit: contain;
		box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
	}

	.preview-backdrop iframe {
		width: 100%;
		max-width: 800px;
		height: 85vh;
		border: none;
		border-radius: 12px;
		background: #fff;
		box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
	}
</style>
