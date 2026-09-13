<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { pb } from '$lib/pb';
	import { isPengurus, isScurity } from '$lib/auth';
	import { toast } from '$lib/ui';
	import type { Lapor, LaporStatus, Warga } from '$lib/types';
	import { getMyWarga } from '$lib/dashboard';
	import {
		listLaporWarga,
		filterLaporForRole,
		updateLapor,
		laporFotoUrl
	} from '$lib/lapor';
	import Modal from '$lib/components/Modal.svelte';
	import States from '$lib/components/States.svelte';

	let list = $state<Lapor[]>([]);
	let loading = $state(true);
	let error = $state('');
	let me = $state<Warga | null>(null);
	let preview = $state<string | null>(null);

	// Edit modal
	let editing = $state<Lapor | null>(null);
	let editStatus = $state<LaporStatus>('Menunggu Konfirmasi');
	let editRespons = $state('');
	let saving = $state(false);

	const STATUS_OPTS: LaporStatus[] = [
		'Menunggu Konfirmasi',
		'Diproses',
		'Selesai',
		'Ditolak'
	];

	onMount(async () => {
		// Scurity tidak boleh masuk halaman ini
		if ($isScurity) {
			goto('/dashboard', { replaceState: true });
			return;
		}
		await load();
	});

	async function load() {
		loading = true;
		error = '';
		try {
			const uid = pb.authStore.record?.id;
			if (uid) {
				try {
					me = await getMyWarga(uid);
					if (me.pengurus) isPengurus.set(true);
				} catch (e) {
					console.warn('warga not found:', e);
				}
			}
			const raw = await listLaporWarga();
			list = filterLaporForRole(raw, me);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Gagal memuat laporan.';
		} finally {
			loading = false;
		}
	}

	function openEdit(l: Lapor) {
		editing = l;
		editStatus = l.status || 'Menunggu Konfirmasi';
		editRespons = l.respons || '';
	}

	async function saveEdit() {
		if (!editing) return;
		saving = true;
		try {
			const rec = await updateLapor(editing.id, {
				status: editStatus,
				respons: editRespons
			});
			list = list.map((it) =>
				it.id === editing!.id ? { ...it, ...rec, expand: it.expand } : it
			);
			editing = null;
			toast('Laporan berhasil diperbarui', 'ok');
		} catch (e) {
			toast(e instanceof Error ? e.message : 'Gagal memperbarui laporan.', 'err');
		} finally {
			saving = false;
		}
	}

	function statusConf(s?: string): { bg: string; color: string; icon: string } {
		if (s === 'Selesai')
			return { bg: '#E8F5EE', color: '#15935A', icon: '✓' };
		if (s === 'Diproses')
			return { bg: '#FBF1DD', color: '#C8821A', icon: '⟳' };
		if (s === 'Ditolak')
			return { bg: '#FBE9E9', color: '#C24A4A', icon: '✕' };
		return { bg: '#EEF1EF', color: '#8A9991', icon: '○' };
	}

	function borderColor(s?: string): string {
		if (s === 'Selesai') return '#15935A';
		if (s === 'Ditolak') return '#C24A4A';
		return '#C8821A';
	}

	function fmtDate(v?: string): string {
		if (!v) return '—';
		return new Date(v).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	const editConf = $derived(editing ? statusConf(editing.status) : null);

	// Stats
	const stats = $derived({
		total: list.length,
		selesai: list.filter((l) => l.status === 'Selesai').length,
		proses: list.filter(
			(l) => l.status === 'Diproses' || !l.status || l.status === 'Menunggu Konfirmasi'
		).length
	});
</script>

<!-- Green header -->
<header class="hd">
	<div class="hd-row">
		<div>
			<div class="lbl">Warga P2S</div>
			<h1>Laporan Warga</h1>
		</div>
		<button class="back-btn" onclick={() => history.back()}>← Kembali</button>
	</div>
</header>

<div class="page-body">
	{#if list.length > 0}
		<div class="stats">
			<div class="stat">
				<div class="v" style="color: var(--c-text)">{stats.total}</div>
				<div class="k">Total</div>
			</div>
			<div class="stat ok">
				<div class="v" style="color: var(--c-primary)">{stats.selesai}</div>
				<div class="k">Selesai</div>
			</div>
			<div class="stat warn">
				<div class="v" style="color: #C8821A">{stats.proses}</div>
				<div class="k">Diproses</div>
			</div>
		</div>
	{/if}

	{#if !$isPengurus && list.length > 0}
		<div class="notice">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
				<circle cx="12" cy="12" r="9" stroke="#C8821A" stroke-width="1.8" />
				<path d="M12 7v6" stroke="#C8821A" stroke-width="1.8" stroke-linecap="round" />
				<circle cx="12" cy="16" r="1" fill="#C8821A" />
			</svg>
			<span>Laporan menunggu konfirmasi hanya terlihat oleh pengurus dan pelapor.</span>
		</div>
	{/if}

	{#if loading}
		<States kind="loading" rows={5} />
	{:else if error}
		<States kind="error" text={error} onRetry={load} />
	{:else if list.length === 0}
		<States
			kind="empty"
			title="Belum ada laporan"
			text={$isPengurus
				? 'Warga belum mengirim laporan apapun.'
				: 'Belum ada laporan yang tersedia.'}
		/>
	{:else}
		<div class="items">
			{#each list as it (it.id)}
				{@const conf = statusConf(it.status)}
				<div class="item card" style="border-left-color: {borderColor(it.status)}">
					<div class="row">
						{#if it.foto}
							<button
								class="thumb"
								onclick={() => (preview = laporFotoUrl(it))}
								aria-label="Preview foto"
							>
								<img
									src={laporFotoUrl(it, '160x160')}
									alt="Foto laporan"
									loading="lazy"
								/>
							</button>
						{/if}
						<div class="body">
							<div class="who">
								<span class="who-name">
									{it.expand?.warga?.expand?.user?.name || 'Warga'}
								</span>
								<span class="who-sub">
									· No. {it.expand?.warga?.no_rumah || '-'}
								</span>
							</div>
							<p class="ket">{it.keterangan || '-'}</p>
							<div class="foot">
								<span
									class="chip stat-chip"
									style="background:{conf.bg}; color:{conf.color}"
								>
									<span class="ico">{conf.icon}</span>
									{it.status || 'Menunggu'}
								</span>
								<span class="date">{fmtDate(it.created)}</span>
							</div>
							{#if it.respons}
								<div class="respons">
									<div class="respons-lbl">Tanggapan Pengurus</div>
									<div class="respons-txt">{it.respons}</div>
								</div>
							{/if}
							{#if $isPengurus}
								<button class="edit-btn" onclick={() => openEdit(it)}>
									<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
										<path
											d="M10 1.5L12.5 4L4.5 12H2V9.5L10 1.5Z"
											stroke="currentColor"
											stroke-width="1.5"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
									Edit / Tanggapi
								</button>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- ═══ Preview foto full-screen ═══ -->
{#if preview}
	<div
		class="preview-back"
		role="dialog"
		aria-modal="true"
		aria-label="Preview foto laporan"
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
			aria-label="Tutup"
		>
			✕
		</button>
		<img src={preview} alt="Preview" />
	</div>
{/if}

<!-- ═══ Modal edit ═══ -->
<Modal
	open={editing !== null}
	title="Edit Laporan"
	onClose={() => (editing = null)}
	maxWidth={460}
>
	{#if editing}
		<div class="edit-warga">
			<div class="ew-badge">
				{(editing.expand?.warga?.no_rumah || '?').slice(-2)}
			</div>
			<div class="ew-mid">
				<div class="ew-name">
					{editing.expand?.warga?.expand?.user?.name || 'Warga'}
				</div>
				<div class="ew-sub">
					No. {editing.expand?.warga?.no_rumah || '-'}
				</div>
			</div>
			{#if editConf}
				<span
					class="chip stat-chip"
					style="background:{editConf.bg}; color:{editConf.color}"
				>
					<span class="ico">{editConf.icon}</span>
					{editing.status || 'Menunggu'}
				</span>
			{/if}
		</div>

		<div class="f-label" style="margin-top: 4px">Status Laporan</div>
		<div class="status-pills">
			{#each STATUS_OPTS as s (s)}
				<button
					class="s-pill"
					class:on={editStatus === s}
					onclick={() => (editStatus = s)}
				>
					{s === 'Menunggu Konfirmasi' ? 'Menunggu' : s}
				</button>
			{/each}
		</div>

		<label class="f-label" for="respons-input" style="margin-top: 16px">
			Tanggapan <span class="opt">(opsional)</span>
		</label>
		<textarea
			id="respons-input"
			class="f-textarea"
			bind:value={editRespons}
			placeholder="Tulis tanggapan untuk warga…"
			rows="3"
		></textarea>

		<div class="modal-actions" style="margin-top: 18px">
			<button
				class="btn btn-outline"
				onclick={() => (editing = null)}
				disabled={saving}
			>
				Batal
			</button>
			<button class="btn btn-primary" onclick={saveEdit} disabled={saving}>
				{saving ? 'Menyimpan…' : 'Simpan Perubahan'}
			</button>
		</div>
	{/if}
</Modal>

<style>
	/* ── Header ── */
	.hd {
		background: var(--c-primary-gradient);
		padding: 22px 18px 40px;
		border-bottom-left-radius: 28px;
		border-bottom-right-radius: 28px;
	}

	.hd-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.lbl {
		color: rgba(255, 255, 255, 0.7);
		font-size: 14px;
		font-weight: 500;
	}

	h1 {
		color: #fff;
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.02em;
		margin-top: 2px;
	}

	.back-btn {
		background: rgba(255, 255, 255, 0.15);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #fff;
		padding: 8px 16px;
		border-radius: 20px;
		font-size: 13px;
		font-weight: 600;
		backdrop-filter: blur(4px);
	}

	.page-body {
		padding: 20px 20px 40px;
		margin-top: -24px;
	}

	/* ── Stats ── */
	.stats {
		display: flex;
		gap: 8px;
		margin-bottom: 16px;
	}

	.stat {
		flex: 1;
		background: #eff1f0;
		border-radius: 14px;
		padding: 12px 10px;
		text-align: center;
	}

	.stat.ok {
		background: #e8f5ee;
	}

	.stat.warn {
		background: #fbf1dd;
	}

	.stat .v {
		font-size: 22px;
		font-weight: 800;
		line-height: 1.2;
	}

	.stat .k {
		font-size: 11px;
		font-weight: 600;
		color: var(--c-text-muted);
		margin-top: 2px;
	}

	/* ── Notice ── */
	.notice {
		display: flex;
		align-items: center;
		gap: 8px;
		background: #fbf1dd;
		border-radius: 12px;
		padding: 10px 14px;
		margin-bottom: 16px;
		font-size: 12px;
		color: #7a5a14;
		line-height: 1.4;
	}

	/* ── Items ── */
	.items {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.item {
		padding: 16px;
		border-left: 4px solid var(--c-border);
	}

	.row {
		display: flex;
		gap: 12px;
	}

	.thumb {
		border: 1px solid #eff1f0;
		border-radius: 12px;
		padding: 0;
		background: none;
		cursor: pointer;
		width: 72px;
		height: 72px;
		flex-shrink: 0;
		overflow: hidden;
	}

	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.body {
		flex: 1;
		min-width: 0;
	}

	.who {
		display: flex;
		gap: 6px;
		align-items: center;
		flex-wrap: wrap;
		margin-bottom: 4px;
	}

	.who-name {
		font-size: 13px;
		font-weight: 700;
		color: var(--c-text);
	}

	.who-sub {
		font-size: 12px;
		color: var(--c-text-light);
		font-weight: 500;
	}

	.ket {
		font-size: 13px;
		color: #475569;
		line-height: 1.45;
		margin-bottom: 8px;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
	}

	.stat-chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 4px 10px;
		border-radius: 20px;
		font-size: 11px;
		font-weight: 700;
	}

	.stat-chip .ico {
		font-size: 13px;
		line-height: 1;
	}

	.date {
		font-size: 11px;
		color: var(--c-text-light);
		white-space: nowrap;
	}

	.respons {
		margin-top: 10px;
		padding: 10px 12px;
		background: #f8fafc;
		border-radius: 10px;
		border-left: 3px solid var(--c-primary);
	}

	.respons-lbl {
		font-size: 10px;
		font-weight: 700;
		color: var(--c-primary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 3px;
	}

	.respons-txt {
		font-size: 12px;
		color: #475569;
		line-height: 1.45;
	}

	.edit-btn {
		margin-top: 10px;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		background: #eff1f0;
		color: var(--c-text);
		border: none;
		border-radius: 10px;
		font-size: 12px;
		font-weight: 700;
		font-family: inherit;
	}

	/* ── Preview overlay ── */
	.preview-back {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: rgba(0, 0, 0, 0.94);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
	}

	.preview-back img {
		max-width: 100%;
		max-height: 88vh;
		border-radius: 14px;
		object-fit: contain;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
	}

	.preview-close {
		position: absolute;
		top: 16px;
		right: 16px;
		background: rgba(255, 255, 255, 0.15);
		border: none;
		border-radius: 50%;
		width: 44px;
		height: 44px;
		color: #fff;
		font-size: 20px;
		backdrop-filter: blur(8px);
	}

	/* ── Edit modal ── */
	.edit-warga {
		display: flex;
		align-items: center;
		gap: 10px;
		background: var(--c-bg);
		border-radius: 12px;
		padding: 12px 14px;
		margin-bottom: 20px;
	}

	.ew-badge {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: var(--c-primary);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 800;
		font-size: 14px;
		flex-shrink: 0;
	}

	.ew-mid {
		flex: 1;
		min-width: 0;
	}

	.ew-name {
		font-size: 14px;
		font-weight: 700;
	}

	.ew-sub {
		font-size: 12px;
		color: var(--c-text-muted);
	}

	.status-pills {
		display: flex;
		gap: 8px;
		margin-top: 6px;
	}

	.s-pill {
		flex: 1;
		padding: 10px 6px;
		background: var(--c-surface);
		border: 1.5px solid var(--c-border);
		border-radius: 12px;
		color: var(--c-text-muted);
		font-size: 11px;
		font-weight: 700;
		font-family: inherit;
		text-align: center;
		line-height: 1.2;
	}

	.s-pill.on {
		background: var(--c-primary-soft);
		border-color: var(--c-primary);
		color: var(--c-primary-dark);
	}

	.opt {
		font-weight: 400;
		color: var(--c-text-light);
	}

	.modal-actions {
		display: flex;
		gap: 10px;
	}

	.modal-actions .btn {
		flex: 1;
		height: 46px;
	}
</style>
