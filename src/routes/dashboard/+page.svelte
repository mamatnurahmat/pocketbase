<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { pb } from '$lib/pb';
	import { isPengurus, isScurity } from '$lib/auth';
	import { modePengurus } from '$lib/mode';
	import { fmtRupiah, initialsOf } from '$lib/ui';
	import type {
		AbsenScurityInfo,
		FileMutasi,
		MutasiRow,
		Tagihan,
		Wallet,
		Warga
	} from '$lib/types';
	import {
		getMyWarga,
		listTagihanForDashboard,
		getWalletKas,
		getWalletPribadi,
		getLastAbsenScurity,
		getMutasiQuick
	} from '$lib/dashboard';
	import Modal from '$lib/components/Modal.svelte';

	// ── State ──
	let warga = $state<Warga | null>(null);
	let tagihan = $state<Tagihan[]>([]);
	let walletKas = $state<Wallet | null>(null);
	let walletPribadi = $state<Wallet | null>(null);
	let walletKasLoaded = $state(false);
	let walletPribadiLoaded = $state(false);
	let walletKasError = $state('');
	let walletPribadiError = $state('');
	let lastAbsen = $state<AbsenScurityInfo | null>(null);
	let mutasiFiles = $state<FileMutasi[]>([]);
	let mutasiRows = $state<MutasiRow[]>([]);
	let mutasiLoading = $state(false);
	let showCallPopup = $state(false);
	let slideIndex = $state(0);
	let touchStartX = 0;

	const slides = [
		{ type: 'kas' as const, label: 'Saldo Kas' },
		{ type: 'pribadi' as const, label: 'Saldo Saya' },
		{ type: 'tagihan' as const, label: 'Tagihan' }
	];

	// ── Fetch ──
	async function loadAll() {
		const userId = pb.authStore.record?.id;
		if (!userId) return;

		// Warga + tagihan
		try {
			const w = await getMyWarga(userId);
			warga = w;
			if (browser) {
				localStorage.setItem('isPengurus', w.pengurus ? 'true' : 'false');
			}
			isPengurus.set(!!w.pengurus);
			// Refresh store setelah flag pengurus terupdate (mode auto-mati kalau
			// user ternyata bukan pengurus).
			modePengurus.refresh();
			try {
				tagihan = await listTagihanForDashboard(
					w.id,
					!!w.pengurus && $modePengurus
				);
			} catch (e) {
				console.warn('tagihan fetch:', e);
			}
		} catch (e) {
			console.warn('warga not found:', e);
		}

		// Wallet pribadi
		try {
			walletPribadi = await getWalletPribadi(userId);
		} catch (e) {
			walletPribadiError = e instanceof Error ? e.message : 'Gagal memuat wallet';
			console.warn('wallet pribadi:', e);
		} finally {
			walletPribadiLoaded = true;
		}

		// Wallet kas
		try {
			walletKas = await getWalletKas();
		} catch (e) {
			walletKasError = e instanceof Error ? e.message : 'Gagal memuat wallet';
			console.warn('wallet kas:', e);
		} finally {
			walletKasLoaded = true;
		}
	}

	async function loadLastAbsen() {
		try {
			lastAbsen = await getLastAbsenScurity();
		} catch (e) {
			console.warn('last absen:', e);
		}
	}

	async function loadMutasiQuick() {
		if (!$isPengurus) return;
		mutasiLoading = true;
		try {
			const { files, rows } = await getMutasiQuick();
			mutasiFiles = files;
			mutasiRows = rows;
		} catch (e) {
			console.warn('mutasi quick:', e);
		} finally {
			mutasiLoading = false;
		}
	}

	onMount(() => {
		if (!pb.authStore.isValid) return;
		void loadAll();
		void loadLastAbsen();
		void loadMutasiQuick();
	});

	// Re-fetch mutasi kalau flag pengurus baru terisi setelah fetch warga
	$effect(() => {
		void $isPengurus;
		if ($isPengurus && mutasiFiles.length === 0 && !mutasiLoading) {
			void loadMutasiQuick();
		}
	});

	// Auto-slide 5 detik
	$effect(() => {
		const timer = setInterval(
			() => (slideIndex = (slideIndex + 1) % slides.length),
			5000
		);
		return () => clearInterval(timer);
	});

	// ── Helpers ──
	function greeting(): string {
		const h = new Date().getHours();
		if (h < 11) return 'Selamat pagi';
		if (h < 15) return 'Selamat siang';
		if (h < 18) return 'Selamat sore';
		return 'Selamat malam';
	}

	function isCurrentMonth(dateStr?: string): boolean {
		if (!dateStr) return false;
		const d = new Date(dateStr);
		const now = new Date();
		return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
	}

	function statusChip(status?: string): string {
		if (status === 'Lunas') return 'ok';
		if (status === 'Menunggu Konfirmasi') return 'warn';
		return 'err';
	}

	function fmtDate(v?: string): string {
		if (!v) return '-';
		return new Date(v).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function onTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
	}

	function onTouchEnd(e: TouchEvent) {
		const diff = touchStartX - e.changedTouches[0].clientX;
		if (Math.abs(diff) > 50) {
			if (diff > 0 && slideIndex < slides.length - 1) slideIndex++;
			else if (diff < 0 && slideIndex > 0) slideIndex--;
		}
	}

	// ── Derived ──
	const unpaid = $derived(
		tagihan.filter((t) => t.status_pembayaran !== 'Lunas')
	);
	const totalUnpaid = $derived(unpaid.reduce((s, t) => s + (t.nominal || 0), 0));
	const unpaidThisMonth = $derived(
		tagihan.filter(
			(t) =>
				t.status_pembayaran !== 'Lunas' && isCurrentMonth(t.jatuh_tempo)
		).length
	);
	const lunasThisMonth = $derived(
		tagihan.filter(
			(t) => t.status_pembayaran === 'Lunas' && isCurrentMonth(t.jatuh_tempo)
		).length
	);

	const user = pb.authStore.record;
	const rawName = (user?.name as string) || (user?.username as string) || '';
	const displayName = $derived(rawName ? rawName.replace('hp_', '') : 'Warga');
	const initials = $derived(initialsOf(displayName));

	const isPengurusMode = $derived($isPengurus && $modePengurus);

	// Reload tagihan kalau user toggle mode pengurus di halaman Profil.
	$effect(() => {
		void $modePengurus;
		if (warga) {
			void listTagihanForDashboard(warga.id, !!warga.pengurus && $modePengurus)
				.then((t) => (tagihan = t))
				.catch((e) => console.warn('reload tagihan:', e));
		}
	});

	const kasName = $derived(walletKas?.expand?.user?.name || 'Bendahara');

	/**
	 * Mask sentinel value: PocketBase v0.39+ menolak balance=0 sehingga
	 * beberapa wallet disimpan 0.01. Anggap < 1 sebagai 0.
	 */
	function maskBalance(v: number | undefined | null): number | null {
		if (v === null || v === undefined) return null;
		return v < 1 ? 0 : v;
	}

	const kasBalance = $derived(maskBalance(walletKas?.balance));
	const myBalance = $derived(maskBalance(walletPribadi?.balance));

	// Teks yang tampil di kartu balance
	function balanceText(
		val: number | null,
		loaded: boolean,
		hasWallet: boolean
	): string {
		if (!loaded) return 'Memuat…';
		if (!hasWallet) return 'Belum tersedia';
		if (val === null) return 'Rp 0';
		return fmtRupiah(val);
	}

	const kasBalanceText = $derived(
		balanceText(kasBalance, walletKasLoaded, !!walletKas)
	);
	const myBalanceText = $derived(
		balanceText(myBalance, walletPribadiLoaded, !!walletPribadi)
	);

	function waLink(hp: string): string {
		return `https://wa.me/${hp.replace(/^0/, '62')}`;
	}
</script>

<!-- ═══════ Green Header ═══════ -->
<header class="hd">
	<div class="hd-row">
		<div class="who">
			<div class="ava">{initials}</div>
			<div>
				<div class="g">{greeting()},</div>
				<div class="n">{displayName}</div>
			</div>
		</div>
		<button class="ava btn-ico" onclick={() => goto('/notifikasi')} aria-label="Notifikasi">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
				<path
					d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"
					stroke="#fff"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<path
					d="M13.7 21a2 2 0 01-3.4 0"
					stroke="#fff"
					stroke-width="1.8"
					stroke-linecap="round"
				/>
			</svg>
		</button>
	</div>
</header>

<div class="page overlap">
	{#if !$isScurity}
		<!-- ═══════ Slide carousel ═══════ -->
		<div class="carousel">
			<div class="dots">
				{#each slides as s, i (s.type)}
					<button
						class="dot"
						class:on={i === slideIndex}
						onclick={() => (slideIndex = i)}
						aria-label={s.label}
					></button>
				{/each}
			</div>

			<div
				class="track-wrap"
				role="region"
				aria-roledescription="carousel"
				aria-label="Ringkasan saldo dan tagihan"
				ontouchstart={onTouchStart}
				ontouchend={onTouchEnd}
			>
				<div class="track" style="transform: translateX(-{slideIndex * 100}%)">
					{#each slides as s (s.type)}
						<div class="slide-item">
							<div class="card slide">
								{#if s.type === 'tagihan'}
									<div class="row">
										<span class="lbl">
											Total tagihan {isPengurusMode ? 'semua warga ' : ''}belum dibayar
										</span>
										{#if unpaid.length > 0}
											<span class="chip warn">{unpaid.length} tagihan</span>
										{/if}
									</div>
									<div class="amount">{fmtRupiah(totalUnpaid)}</div>
									<button class="btn btn-primary sm" onclick={() => goto('/tagihan')}>
										Lihat tagihan
									</button>
								{:else if s.type === 'kas'}
									<div class="row">
										<span class="lbl">Saldo kas warga</span>
										<span class="mini">🏦 {kasName}</span>
									</div>
									<div
										class="amount"
										style:color={kasBalance != null && kasBalance > 0
											? 'var(--c-primary)'
											: 'var(--c-text)'}
									>
										{kasBalanceText}
									</div>
									<div class="hint">
										{walletKasError
											? walletKasError
											: 'Dana bersama untuk operasional & kegiatan warga'}
									</div>
									<button
										class="btn btn-outline sm"
										onclick={() => walletKas && goto(`/riwayat/${walletKas.id}`)}
										disabled={!walletKas}
									>
										Lihat Riwayat
									</button>
								{:else}
									<div class="row">
										<span class="lbl">Saldo dompet saya</span>
										<span class="mini">💳 Pribadi</span>
									</div>
									<div
										class="amount"
										style:color={myBalance != null && myBalance > 0
											? 'var(--c-primary)'
											: 'var(--c-text)'}
									>
										{myBalanceText}
									</div>
									{#if walletPribadiError}
										<div class="hint" style="color: var(--c-red)">
											{walletPribadiError}
										</div>
									{/if}
									<div class="hint">
										Top up untuk bayar iuran & transfer antar warga
									</div>
									<div class="row-btns">
										<button
											class="btn btn-outline sm"
											onclick={() => goto('/tagihan')}
										>
											Cek Tagihan
										</button>
										<button
											class="btn btn-outline sm"
											style="border-color: #2563EB; color: #2563EB;"
											onclick={() => walletPribadi && goto(`/riwayat/${walletPribadi.id}`)}
											disabled={!walletPribadi}
										>
											📊 Riwayat
										</button>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- ═══════ Stats grid ═══════ -->
		<div class="stats">
			<div class="stat card">
				<div class="v" style="color: var(--c-red)">{unpaidThisMonth}</div>
				<div class="k">Belum Bayar (Bulan Ini)</div>
			</div>
			<div class="stat card">
				<div class="v" style="color: var(--c-primary)">{lunasThisMonth}</div>
				<div class="k">Lunas (Bulan Ini)</div>
			</div>
		</div>
	{/if}

	<!-- ═══════ Quick actions ═══════ -->
	<div class="card qa-wrap">
		<div class="qa-grid">
			{#if $isScurity}
				<button class="qa" onclick={() => goto('/warga')}>
					<span class="qa-ico" style="background:#E3F2FD; color:#1976D2">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.8"/></svg>
					</span>
					<span>Warga</span>
				</button>
				<button class="qa" onclick={() => goto('/map')}>
					<span class="qa-ico" style="background:#FBF0DC; color:#B87514">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 3l6 2 6-2v16l-6 2-6-2-6 2V5l6-2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 3v16m6-14v16" stroke="currentColor" stroke-width="1.8"/></svg>
					</span>
					<span>Siteplan</span>
				</button>
			{:else}
				<button class="qa" onclick={() => goto('/laporan-warga')}>
					<span class="qa-ico" style="background:#FCE4EC; color:#D81B60">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 12h8m-8-4h8m-8 8h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" stroke-width="1.8"/></svg>
					</span>
					<span>Lap. Warga</span>
				</button>
				<button class="qa" onclick={() => goto('/warga')}>
					<span class="qa-ico" style="background:#E3F2FD; color:#1976D2">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.8"/></svg>
					</span>
					<span>Warga</span>
				</button>
				{#if $isPengurus}
					<button class="qa" onclick={() => goto('/mutasi')}>
						<span class="qa-ico" style="background:#E0F2F1; color:#00796B">
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" stroke-width="1.8"/><path d="M7 9h4m-4 4h10m-10 4h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
						</span>
						<span>Mutasi</span>
					</button>
				{/if}
				<button class="qa" onclick={() => goto('/map')}>
					<span class="qa-ico" style="background:#FBF0DC; color:#B87514">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 3l6 2 6-2v16l-6 2-6-2-6 2V5l6-2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 3v16m6-14v16" stroke="currentColor" stroke-width="1.8"/></svg>
					</span>
					<span>Siteplan</span>
				</button>
				<button class="qa" onclick={() => (showCallPopup = true)}>
					<span class="qa-ico" style="background: var(--c-primary-soft); color: var(--c-primary)">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
					</span>
					<span>Call Scurity</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- ═══════ Info warga ═══════ -->
	{#if !$isScurity && warga}
		<h3 class="section-title">Info warga</h3>
		<div class="card info-row">
			<div class="info-ico">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none">
					<path d="M3 11.5L12 4l9 7.5" stroke="#15935A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
					<path d="M5 10.5V20h14v-9.5" stroke="#15935A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</div>
			<div class="info-body">
				<span class="info-t">No. Rumah: {warga.no_rumah || '-'}</span>
				<span class="info-s">
					HP: {warga.no_hp || (user?.username?.startsWith?.('hp_') ? user.username.replace('hp_', '') : '-')}
				</span>
			</div>
		</div>
	{/if}

	<!-- ═══════ Recent tagihan ═══════ -->
	{#if !$isScurity && unpaid.length > 0}
		<div class="row-head">
			<h3 class="section-title" style="margin: 0">Tagihan aktif</h3>
			<button class="link" onclick={() => goto('/tagihan')}>Lihat semua</button>
		</div>
		<div class="list">
			{#each unpaid.slice(0, 3) as t (t.id)}
				<div class="tagihan-item card">
					<div class="ti-ico">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none">
							<rect x="4" y="3" width="16" height="18" rx="3" stroke="#15935A" stroke-width="1.8"/>
							<path d="M8 8h8M8 12h8M8 16h5" stroke="#15935A" stroke-width="1.8" stroke-linecap="round"/>
						</svg>
					</div>
					<div class="ti-mid">
						<span class="ti-t">{t.expand?.iuran?.kode || '-'}</span>
						<span class="ti-s">{fmtDate(t.jatuh_tempo)}</span>
					</div>
					<div class="ti-right">
						<span class="ti-amt">{fmtRupiah(t.nominal)}</span>
						<span class="chip {statusChip(t.status_pembayaran)}">
							{t.status_pembayaran === 'Menunggu Konfirmasi'
								? 'Menunggu'
								: t.status_pembayaran}
						</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- ═══════ Mutasi terbaru (pengurus) ═══════ -->
	{#if $isPengurus}
		<div class="card mutasi">
			<div class="mut-head">
				<div>
					<div class="mut-title">📊 Mutasi Terbaru</div>
					<div class="mut-sub">
						{mutasiFiles.length > 0
							? mutasiFiles[0].bulan || mutasiFiles[0].nama_file || '—'
							: 'Belum ada data'}
					</div>
				</div>
				<button
					class="mut-cta"
					onclick={() => goto('/mutasi')}
				>
					Lihat Semua →
				</button>
			</div>

			{#if mutasiLoading}
				<div class="mut-state">Memuat…</div>
			{:else if mutasiRows.length === 0}
				<div class="mut-state">
					Belum ada data mutasi — upload PDF di halaman Mutasi
				</div>
			{:else}
				<div class="mut-scroll">
					<table class="mut-table">
						<thead>
							<tr>
								<th class="c">No</th>
								<th>Keterangan</th>
								<th class="r">Keluar</th>
								<th class="r">Masuk</th>
								<th class="r">Saldo</th>
							</tr>
						</thead>
						<tbody>
							{#each mutasiRows as m (m.id)}
								<tr>
									<td class="c muted">{m.no_urut}</td>
									<td class="trunc">{m.keterangan || '-'}</td>
									<td class="r out">
										{m.mutasi_debet ? fmtRupiah(m.mutasi_debet) : '-'}
									</td>
									<td class="r in">
										{m.mutasi_kredit ? fmtRupiah(m.mutasi_kredit) : '-'}
									</td>
									<td class="r bal">{fmtRupiah(m.saldo_akhir)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- ═══════ Modal Call Scurity ═══════ -->
<Modal
	open={showCallPopup}
	title="📞 Call Scurity"
	maxWidth={360}
	onClose={() => (showCallPopup = false)}
>
	{#if lastAbsen}
		<div class="call-body">
			<div class="call-ava">
				{initialsOf(lastAbsen.nama)}
			</div>
			<div class="call-name">{lastAbsen.nama}</div>
			<div class="call-hp">{lastAbsen.no_hp}</div>
			<div class="call-note">Scurity terakhir yang absen</div>
			{#if lastAbsen.no_hp && lastAbsen.no_hp !== '-'}
				<a
					href={waLink(lastAbsen.no_hp)}
					target="_blank"
					rel="noopener noreferrer"
					class="btn btn-primary call-wa"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
						<path
							d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
							stroke="#fff"
							stroke-width="1.8"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					Call via WhatsApp
				</a>
			{/if}
		</div>
	{:else}
		<div class="call-empty">
			<div class="ico-lg">🛡️</div>
			<div class="empt-t">Belum ada scurity absen</div>
			<div class="empt-s">Tunggu scurity melakukan absen</div>
		</div>
	{/if}
	<button
		class="btn btn-outline"
		style="margin-top: 14px;"
		onclick={() => (showCallPopup = false)}
	>
		Tutup
	</button>
</Modal>

<style>
	/* ── Header hijau ── */
	.hd {
		background: var(--c-primary-gradient);
		padding: 22px 18px 60px;
		border-bottom-left-radius: 28px;
		border-bottom-right-radius: 28px;
	}

	.hd-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.who {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.ava {
		width: 44px;
		height: 44px;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.18);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 800;
		font-size: 15px;
	}

	.btn-ico {
		border: none;
	}

	.g {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.75);
		font-weight: 500;
	}

	.n {
		font-size: 16px;
		font-weight: 700;
		color: #fff;
		text-transform: capitalize;
	}

	.overlap {
		margin-top: -44px;
		position: relative;
	}

	/* ── Carousel ── */
	.carousel {
		margin-top: -8px;
	}

	.dots {
		display: flex;
		gap: 6px;
		justify-content: center;
		margin-bottom: 10px;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.5);
		border: none;
		padding: 0;
		transition: width 0.2s;
	}

	.dot.on {
		background: #fff;
		width: 22px;
		border-radius: 3px;
	}

	.track-wrap {
		overflow: hidden;
		border-radius: var(--radius-card);
	}

	.track {
		display: flex;
		transition: transform 0.35s ease;
	}

	.slide-item {
		flex: 0 0 100%;
	}

	.slide {
		padding: 18px 20px;
		box-shadow: 0 10px 30px -12px rgba(15, 26, 20, 0.18);
	}

	.slide .row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.slide .lbl {
		font-size: 13px;
		font-weight: 600;
		color: var(--c-text-muted);
	}

	.slide .mini {
		font-size: 12px;
		font-weight: 500;
		color: var(--c-text-light);
	}

	.slide .amount {
		margin-top: 10px;
		font-size: 28px;
		font-weight: 800;
		font-family: var(--mono);
		letter-spacing: -0.02em;
	}

	.slide .hint {
		margin-top: 6px;
		font-size: 12px;
		color: var(--c-text-light);
	}

	.slide .row-btns {
		display: flex;
		gap: 8px;
		margin-top: 16px;
	}

	.btn.sm {
		height: 42px;
		font-size: 14px;
		margin-top: 16px;
		width: 100%;
	}

	.row-btns .btn.sm {
		margin-top: 0;
		flex: 1;
	}

	/* ── Stats ── */
	.stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-top: 16px;
	}

	.stat {
		padding: 16px 12px;
		text-align: center;
	}

	.stat .v {
		font-size: 24px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}

	.stat .k {
		margin-top: 4px;
		font-size: 12px;
		color: var(--c-text-muted);
		font-weight: 600;
	}

	/* ── Quick actions ── */
	.qa-wrap {
		margin-top: 16px;
		padding: 18px 8px;
	}

	.qa-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 12px 4px;
	}

	.qa {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		background: transparent;
		border: none;
		padding: 6px 4px;
		font-family: inherit;
		font-size: 11px;
		font-weight: 700;
		color: var(--c-text);
		text-align: center;
	}

	.qa:active {
		transform: scale(0.94);
	}

	.qa-ico {
		width: 44px;
		height: 44px;
		border-radius: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	@media (max-width: 360px) {
		.qa-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	/* ── Info warga ── */
	.info-row {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 16px;
	}

	.info-ico {
		width: 44px;
		height: 44px;
		border-radius: 14px;
		background: var(--c-primary-soft);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.info-body {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.info-t {
		font-size: 14px;
		font-weight: 800;
	}

	.info-s {
		font-size: 12px;
		color: var(--c-text-muted);
		font-weight: 600;
	}

	/* ── Tagihan aktif ── */
	.row-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 24px 2px 10px;
	}

	.link {
		border: none;
		background: none;
		color: var(--c-primary);
		font-size: 13px;
		font-weight: 700;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 9px;
	}

	.tagihan-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
	}

	.ti-ico {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		background: var(--c-primary-soft);
		display: flex;
		align-items: center;
		justify-content: center;
		flex: none;
	}

	.ti-mid {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.ti-t {
		font-size: 14px;
		font-weight: 800;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ti-s {
		font-size: 12px;
		font-weight: 600;
		color: var(--c-text-muted);
	}

	.ti-right {
		flex-shrink: 0;
		text-align: right;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
	}

	.ti-amt {
		font-size: 14px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}

	/* ── Mutasi terbaru ── */
	.mutasi {
		margin-top: 16px;
		padding: 18px 16px;
	}

	.mut-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
		gap: 10px;
	}

	.mut-title {
		font-size: 15px;
		font-weight: 800;
	}

	.mut-sub {
		font-size: 11px;
		color: var(--c-text-muted);
		margin-top: 2px;
	}

	.mut-cta {
		background: #E0F2F1;
		color: #00796B;
		border: none;
		border-radius: 10px;
		padding: 8px 12px;
		font-size: 12px;
		font-weight: 700;
		font-family: inherit;
	}

	.mut-state {
		text-align: center;
		padding: 20px;
		color: var(--c-text-light);
		font-size: 12px;
	}

	.mut-scroll {
		overflow-x: auto;
	}

	.mut-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 10.5px;
		min-width: 480px;
	}

	.mut-table thead tr {
		background: #F5FAF7;
	}

	.mut-table th {
		padding: 6px 4px;
		font-weight: 700;
		color: var(--c-text);
		border-bottom: 1px solid var(--c-border);
		text-align: left;
	}

	.mut-table td {
		padding: 6px 4px;
		border-bottom: 1px solid var(--c-border-light);
		vertical-align: middle;
		white-space: nowrap;
	}

	.mut-table .c {
		text-align: center;
	}

	.mut-table .r {
		text-align: right;
	}

	.mut-table .muted {
		color: var(--c-text-muted);
	}

	.mut-table .trunc {
		max-width: 160px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mut-table .out {
		color: var(--c-red);
	}

	.mut-table .in {
		color: var(--c-primary);
	}

	.mut-table .bal {
		font-weight: 700;
	}

	/* ── Call modal ── */
	.call-body {
		text-align: center;
		padding: 12px 0;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.call-ava {
		width: 72px;
		height: 72px;
		border-radius: 50%;
		background: var(--c-primary-soft);
		color: var(--c-primary);
		font-size: 26px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 14px;
	}

	.call-name {
		font-size: 20px;
		font-weight: 800;
		color: var(--c-text);
		text-transform: capitalize;
	}

	.call-hp {
		font-size: 15px;
		font-weight: 600;
		color: var(--c-text-muted);
		margin-top: 4px;
		font-variant-numeric: tabular-nums;
	}

	.call-note {
		font-size: 12px;
		color: var(--c-text-light);
		margin-top: 14px;
	}

	.call-wa {
		margin-top: 20px;
		width: auto;
		padding: 0 20px;
		height: 48px;
		text-decoration: none;
	}

	.call-empty {
		text-align: center;
		padding: 30px 0;
	}

	.ico-lg {
		font-size: 42px;
	}

	.empt-t {
		font-size: 15px;
		font-weight: 700;
		margin-top: 8px;
	}

	.empt-s {
		font-size: 13px;
		color: var(--c-text-muted);
		margin-top: 4px;
	}
</style>
