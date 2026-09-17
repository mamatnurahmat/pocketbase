<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/pb';
	import { isPengurus } from '$lib/auth';
	import { fmtRupiah, toast } from '$lib/ui';
	import type { FileMutasi, MutasiRow } from '$lib/types';
	import {
		listFileMutasi,
		listMutasiRows,
		fileMutasiUrl,
		uploadFileMutasi
	} from '$lib/mutasi';
	import States from '$lib/components/States.svelte';

	let files = $state<FileMutasi[]>([]);
	let selected = $state<FileMutasi | null>(null);
	let rows = $state<MutasiRow[]>([]);
	let loading = $state(true);
	let loadingDetail = $state(false);
	let error = $state('');
	let showUpload = $state(false);
	let uploading = $state(false);

	// Upload form
	let uploadFile = $state<File | null>(null);
	let password = $state('08111992');
	let bulan = $state(defaultBulan());

	function defaultBulan(): string {
		const d = new Date();
		return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
	}

	async function loadFiles(preserveSelectedId?: string) {
		loading = true;
		error = '';
		try {
			files = await listFileMutasi();
			if (files.length > 0) {
				if (preserveSelectedId) {
					selected = files.find((f) => f.id === preserveSelectedId) ?? files[0];
				} else {
					selected = files[0];
				}
			} else {
				selected = null;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Gagal memuat file mutasi.';
		} finally {
			loading = false;
		}
	}

	async function loadRows(fileId: string) {
		loadingDetail = true;
		try {
			rows = await listMutasiRows(fileId);
		} catch (e) {
			console.warn('rows fetch:', e);
			rows = [];
		} finally {
			loadingDetail = false;
		}
	}

	onMount(() => {
		if (pb.authStore.isValid) void loadFiles();
	});

	$effect(() => {
		if (selected) void loadRows(selected.id);
		else rows = [];
	});

	function onFilePicked(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		uploadFile = input.files?.[0] ?? null;
	}

	async function submitUpload(e: Event) {
		e.preventDefault();
		if (!uploadFile) {
			toast('Pilih file PDF dulu', 'err');
			return;
		}
		uploading = true;
		try {
			const res = await uploadFileMutasi(uploadFile, password, bulan);
			toast(
				`${res.message ?? 'Upload sukses'} — ${res.jumlah_transaksi ?? 0} transaksi (bulan ${res.bulan ?? bulan})`,
				'ok'
			);
			showUpload = false;
			uploadFile = null;
			await loadFiles();
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Upload gagal.', 'err');
		} finally {
			uploading = false;
		}
	}

	function fmtTanggal(v?: string): string {
		if (!v) return '-';
		return new Date(v).toLocaleDateString('id-ID', {
			day: '2-digit',
			month: 'short'
		});
	}

	function fmtPeriode(f: FileMutasi): string {
		const parts: string[] = [];
		if (f.bulan) parts.push(`Bulan ${f.bulan}`);
		if (f.periode_awal)
			parts.push(fmtTanggal(f.periode_awal));
		if (f.periode_akhir)
			parts[parts.length - 1] += ` — ${fmtTanggal(f.periode_akhir)}`;
		return parts.filter(Boolean).join(' · ');
	}
</script>

<div class="page">
	<div class="head">
		<div>
			<h1>Mutasi Rekening</h1>
			<p>Data mutasi dari file PDF yang diupload</p>
		</div>
		{#if $isPengurus}
			<button class="btn-upload" onclick={() => (showUpload = !showUpload)}>
				{showUpload ? 'Tutup' : '+ Upload'}
			</button>
		{/if}
	</div>

	<!-- Form upload -->
	{#if $isPengurus && showUpload}
		<form class="card upload-form" onsubmit={submitUpload}>
			<h4>📄 Upload Mutasi PDF</h4>
			<label class="f-label" for="mutasi-file">File PDF</label>
			<input
				id="mutasi-file"
				type="file"
				accept="application/pdf"
				onchange={onFilePicked}
				required
				class="mini-input"
			/>
			<label class="f-label" for="mutasi-pass">Password PDF</label>
			<input
				id="mutasi-pass"
				type="text"
				bind:value={password}
				placeholder="08111992"
				class="mini-input"
			/>
			<label class="f-label" for="mutasi-bulan">Bulan (MM-YYYY)</label>
			<input
				id="mutasi-bulan"
				type="text"
				bind:value={bulan}
				pattern="\d{'{'}2{'}'}-\d{'{'}4{'}'}"
				maxlength="7"
				placeholder="08-2026"
				class="mini-input"
			/>
			<button class="btn btn-primary" type="submit" disabled={uploading}>
				{uploading ? 'Mengupload & Parse…' : 'Upload & Parse'}
			</button>
		</form>
	{/if}

	<!-- Summary card file terpilih -->
	{#if selected}
		<div class="summary">
			<div class="s-head">
				<div>
					<div class="s-name">📄 {selected.nama_file || '(tanpa nama)'}</div>
					<div class="s-period">{fmtPeriode(selected)}</div>
				</div>
				{#if selected.file_pdf}
					<a
						class="s-pdf"
						href={fileMutasiUrl(selected)}
						target="_blank"
						rel="noreferrer"
					>
						📥 PDF
					</a>
				{/if}
			</div>
			<div class="s-grid">
				<div class="s-cell">
					<div class="k">Saldo Awal</div>
					<div class="v">{fmtRupiah(selected.saldo_awal)}</div>
				</div>
				<div class="s-cell">
					<div class="k">Saldo Akhir</div>
					<div class="v">{fmtRupiah(selected.saldo_akhir)}</div>
				</div>
				<div class="s-cell">
					<div class="k">Total Masuk</div>
					<div class="v small">{fmtRupiah(selected.total_kredit)}</div>
				</div>
				<div class="s-cell">
					<div class="k">Total Keluar</div>
					<div class="v small">{fmtRupiah(selected.total_debet)}</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- File selector -->
	{#if files.length > 0}
		<div class="pills">
			{#each files as f (f.id)}
				<button
					class="pill"
					class:on={selected?.id === f.id}
					onclick={() => (selected = f)}
				>
					{f.bulan || f.nama_file}
				</button>
			{/each}
		</div>
	{/if}

	<!-- Table -->
	<div class="table-wrap">
		{#if loading || loadingDetail}
			<States kind="loading" rows={6} />
		{:else if error}
			<States kind="error" text={error} onRetry={() => loadFiles()} />
		{:else if !selected}
			<States kind="empty" title="Belum ada file mutasi" text="Upload PDF dulu ya." />
		{:else if rows.length === 0}
			<States
				kind="empty"
				title="Belum ada data mutasi"
				text="Upload PDF di halaman ini."
			/>
		{:else}
			<div class="scroll">
				<table class="tbl">
					<thead>
						<tr>
							<th class="c">No</th>
							<th>Tanggal</th>
							<th>Keterangan</th>
							<th class="r">Debet</th>
							<th class="r">Kredit</th>
							<th class="r">Saldo</th>
						</tr>
					</thead>
					<tbody>
						{#each rows as m (m.id)}
							<tr>
								<td class="c muted">{m.no_urut}</td>
								<td class="nw">{fmtTanggal(m.tanggal_posting)}</td>
								<td class="trunc">{m.keterangan || '-'}</td>
								<td class="r out">{m.mutasi_debet ? fmtRupiah(m.mutasi_debet) : '-'}</td>
								<td class="r in">{m.mutasi_kredit ? fmtRupiah(m.mutasi_kredit) : '-'}</td>
								<td class="r bal">{fmtRupiah(m.saldo_akhir)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<style>
	.page {
		padding: 16px 20px 40px;
	}

	.head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 16px;
	}

	.head h1 {
		font-size: 18px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.head p {
		font-size: 12px;
		color: var(--c-text-muted);
		margin-top: 4px;
	}

	.btn-upload {
		background: var(--c-primary);
		color: #fff;
		border: none;
		border-radius: 12px;
		padding: 10px 16px;
		font-size: 13px;
		font-weight: 700;
		font-family: inherit;
	}

	.upload-form {
		padding: 16px;
		margin-bottom: 16px;
	}

	.upload-form h4 {
		font-size: 14px;
		font-weight: 800;
		margin-bottom: 12px;
	}

	.mini-input {
		width: 100%;
		padding: 10px;
		border: 1.5px solid var(--c-border);
		border-radius: 10px;
		font-size: 12px;
		font-family: inherit;
		background: var(--c-surface);
		margin-bottom: 10px;
	}

	.upload-form .btn {
		margin-top: 4px;
		height: 44px;
	}

	.summary {
		background: linear-gradient(145deg, #147a4a, #0c6b40);
		border-radius: 16px;
		padding: 18px;
		color: #fff;
		margin-bottom: 16px;
	}

	.s-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 10px;
	}

	.s-name {
		font-size: 12px;
		font-weight: 600;
		opacity: 0.9;
	}

	.s-period {
		font-size: 11px;
		opacity: 0.7;
		margin-top: 2px;
	}

	.s-pdf {
		background: rgba(255, 255, 255, 0.2);
		padding: 8px 12px;
		border-radius: 10px;
		font-size: 11px;
		color: #fff;
		text-decoration: none;
		font-weight: 700;
		white-space: nowrap;
	}

	.s-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-top: 12px;
	}

	.s-cell {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		padding: 8px 10px;
	}

	.s-cell .k {
		font-size: 10px;
		opacity: 0.7;
	}

	.s-cell .v {
		font-size: 15px;
		font-weight: 700;
		font-family: var(--mono);
		margin-top: 2px;
	}

	.s-cell .v.small {
		font-size: 13px;
	}

	.pills {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		padding-bottom: 4px;
		margin-bottom: 12px;
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
		padding: 8px 14px;
		border-radius: 20px;
		font-size: 11px;
		font-weight: 600;
		font-family: inherit;
		white-space: nowrap;
	}

	.pill.on {
		background: var(--c-primary-soft);
		border-color: var(--c-primary);
		color: var(--c-primary-dark);
		font-weight: 700;
	}

	.table-wrap {
		margin-top: 4px;
	}

	.scroll {
		overflow-x: auto;
	}

	.tbl {
		width: 100%;
		border-collapse: collapse;
		font-size: 11px;
		min-width: 600px;
	}

	.tbl thead tr {
		background: #f5faf7;
	}

	.tbl th {
		padding: 8px 6px;
		font-weight: 700;
		color: var(--c-text);
		border-bottom: 1px solid var(--c-border);
		text-align: left;
	}

	.tbl td {
		padding: 7px 6px;
		border-bottom: 1px solid var(--c-border-light);
		vertical-align: middle;
	}

	.tbl .c {
		text-align: center;
	}

	.tbl .r {
		text-align: right;
	}

	.tbl .nw {
		white-space: nowrap;
	}

	.tbl .muted {
		color: var(--c-text-muted);
	}

	.tbl .trunc {
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tbl .out {
		color: var(--c-red);
		white-space: nowrap;
	}

	.tbl .in {
		color: var(--c-primary);
		white-space: nowrap;
	}

	.tbl .bal {
		font-weight: 700;
		white-space: nowrap;
	}
</style>
